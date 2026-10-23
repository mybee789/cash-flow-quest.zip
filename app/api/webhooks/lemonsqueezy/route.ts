import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  subscriptionActivatedEmail,
  subscriptionCanceledEmail,
  subscriptionPastDueEmail,
} from "@/lib/email";

export const runtime = "nodejs";

interface LemonSqueezyWebhookBody {
  meta: {
    event_name: string;
    custom_data?: { supabase_user_id?: string };
  };
  data: {
    attributes: {
      user_email: string;
      status: string; // "active" | "past_due" | "unpaid" | "cancelled" | "expired" | "on_trial" | "paused"
      customer_id: number;
    };
    id: string; // subscription id
  };
}

/**
 * POST /api/webhooks/lemonsqueezy
 * Configure this URL as a Webhook in your Lemon Squeezy store settings,
 * subscribed to: subscription_created, subscription_updated,
 * subscription_cancelled, subscription_expired, subscription_payment_failed.
 *
 * Pass `custom_data: { supabase_user_id }` when creating the checkout
 * (via the Lemon Squeezy checkout API or a signed checkout URL) so this
 * handler can match the event back to a Supabase user.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get("x-signature");

  if (!signatureHeader || !isValidSignature(rawBody, signatureHeader)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let payload: LemonSqueezyWebhookBody;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const supabaseUserId = payload.meta.custom_data?.supabase_user_id;
  const { status, user_email, customer_id } = payload.data.attributes;
  const subscriptionId = payload.data.id;

  try {
    switch (payload.meta.event_name) {
      case "subscription_created":
      case "subscription_updated": {
        const planStatus = mapLemonSqueezyStatus(status);

        const query = supabase
          .from("users")
          .update({
            plan: planStatus === "active" ? "pro" : "free",
            plan_status: planStatus,
            lemonsqueezy_customer_id: String(customer_id),
            lemonsqueezy_subscription_id: subscriptionId,
          })
          .select("email")
          .single();

        const { data: updated } = supabaseUserId
          ? await query.eq("id", supabaseUserId)
          : await query.eq("lemonsqueezy_subscription_id", subscriptionId);

        if (planStatus === "active" && updated?.email) {
          await subscriptionActivatedEmail(updated.email);
        }
        if (planStatus === "past_due" && updated?.email) {
          await subscriptionPastDueEmail(updated.email);
        }
        break;
      }

      case "subscription_cancelled":
      case "subscription_expired": {
        const { data: updated } = await supabase
          .from("users")
          .update({ plan: "free", plan_status: "canceled" })
          .eq("lemonsqueezy_subscription_id", subscriptionId)
          .select("email")
          .single();

        if (updated?.email) {
          await subscriptionCanceledEmail(updated.email);
        }
        break;
      }

      case "subscription_payment_failed": {
        const { data: updated } = await supabase
          .from("users")
          .update({ plan_status: "past_due" })
          .eq("lemonsqueezy_subscription_id", subscriptionId)
          .select("email")
          .single();

        if (updated?.email) {
          await subscriptionPastDueEmail(updated.email);
        }
        break;
      }

      default:
        void user_email;
        break;
    }
  } catch (err) {
    console.error(`Error handling Lemon Squeezy event ${payload.meta.event_name}:`, err);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function isValidSignature(rawBody: string, signatureHeader: string): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) return false;

  const hmac = crypto.createHmac("sha256", secret);
  const digest = Buffer.from(hmac.update(rawBody).digest("hex"), "utf8");
  const signature = Buffer.from(signatureHeader, "utf8");

  return digest.length === signature.length && crypto.timingSafeEqual(digest, signature);
}

function mapLemonSqueezyStatus(
  status: string
): "active" | "past_due" | "canceled" | "inactive" {
  switch (status) {
    case "active":
    case "on_trial":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "cancelled":
    case "expired":
      return "canceled";
    default:
      return "inactive";
  }
}
