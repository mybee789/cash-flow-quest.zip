import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-09-30.endive' as any,
  });

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await req.text();
  const signature = (await headers()).get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const customerEmail = session.customer_details?.email;
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    const { error } = await supabaseAdmin
      .from('subscriptions')
      .upsert({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        email: customerEmail,
        status: 'active',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'stripe_customer_id' });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
