import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  subscriptionActivatedEmail,
  subscriptionCanceledEmail,
  subscriptionPastDueEmail,
} from "@/lib/email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

// Route Handlers get the raw body by default under the App Router, which
// is required for Stripe's signature check — do not add a body parser.
export const runtime = "nodejs";

/**
 * POST /api/webhooks/stripe
 * Configure this URL in the Stripe Dashboard (or `stripe listen` for local
 * dev) subscribed to: checkout.session.completed, customer.subscription.*,
 * invoice.payment_failed.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const supabaseUserId = session.subscription_data?.metadata?.supabase_user_id
          ?? session.metadata?.supabase_user_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!supabaseUserId) {
          console.error("checkout.session.completed missing supabase_user_id metadata");
          break;
        }

        const { data: updated } = await supabase
          .from("users")
          .update({
            plan: "pro",
            plan_status: "active",
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
          })
          .eq("id", supabaseUserId)
          .select("email")
          .single();

        if (updated?.email) {
          await subscriptionActivatedEmail(updated.email);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const planStatus = mapStripeStatus(subscription.status);

        await supabase
          .from("users")
          .update({
            plan: planStatus === "active" ? "pro" : "free",
            plan_status: planStatus,
          })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const { data: updated } = await supabase
          .from("users")
          .update({ plan: "free", plan_status: "canceled" })
          .eq("stripe_subscription_id", subscription.id)
          .select("email")
          .single();

        if (updated?.email) {
          await subscriptionCanceledEmail(updated.email);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string | null;
        if (!subscriptionId) break;

        const { data: updated } = await supabase
          .from("users")
          .update({ plan_status: "past_due" })
          .eq("stripe_subscription_id", subscriptionId)
          .select("email")
          .single();

        if (updated?.email) {
          await subscriptionPastDueEmail(updated.email);
        }
        break;
      }

      default:
        // Unhandled event types are expected and fine to ignore.
        break;
    }
  } catch (err) {
    console.error(`Error handling Stripe event ${event.type}:`, err);
    // Return 500 so Stripe retries delivery — do not swallow handler errors.
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function mapStripeStatus(status: Stripe.Subscription.Status): "active" | "past_due" | "canceled" | "inactive" {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "inactive";
  }
}
