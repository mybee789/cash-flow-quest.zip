import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function POST() {
  try {
    const secretKey = getRequiredEnv("STRIPE_SECRET_KEY");
    const priceId = getRequiredEnv("STRIPE_PRICE_ID");
    const origin = getRequiredEnv("NEXT_PUBLIC_SITE_URL").replace(/\/$/, "");

    const stripe = new Stripe(secretKey, {
      apiVersion: "2024-06-20",
    });

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please sign in to upgrade to Pro." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id, email")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Could not load user billing profile:", profileError);
      return NextResponse.json(
        { error: "Unable to load your billing profile." },
        { status: 500 }
      );
    }

    let customerId = profile?.stripe_customer_id ?? undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? profile?.email ?? undefined,
        metadata: {
          supabase_user_id: user.id,
        },
      });

      customerId = customer.id;

      const { error: updateError } = await supabase
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);

      if (updateError) {
        console.error("Could not save Stripe customer ID:", updateError);

        // Keep the checkout flow available, but log the persistence issue.
        // A retry could create another Stripe customer.
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=canceled`,
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
        },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout session creation failed:", error);

    return NextResponse.json(
      { error: "Couldn't start checkout. Please try again." },
      { status: 500 }
    );
  }
}
