# Cash Flow Quest

Gamified cash flow tracker for gig workers and freelancers with irregular
paychecks. Log income/expenses, keep a daily streak, watch a health score
that blends runway, consistency, and trend.

Stack: Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase
(Postgres + Auth) · Stripe (and/or Lemon Squeezy) for billing. Everything
below runs on each provider's free tier.

## 1. Install

```bash
npm install
cp .env.example .env.local
```

## 2. Supabase

1. Create a free project at supabase.com.
2. SQL Editor → New query → paste the full contents of `supabase/schema.sql`
   → Run. This creates `users`, `transactions`, `streaks`, the triggers that
   auto-create a user row on signup, and the streak/health-score
   bookkeeping, plus Row Level Security policies locking every table to its
   owner.
3. Project Settings → API → copy the Project URL, `anon` key, and
   `service_role` key into `.env.local`. **Never** expose the service-role
   key to the browser — it's used only in webhook routes via
   `createServiceRoleClient()`.
4. Authentication → Providers → Email is on by default. Turn off "Confirm
   email" if you want instant signup during testing.

## 3. Stripe

1. Create a free Stripe account (test mode needs no card).
2. Product catalog → add a product ("Cash Flow Quest Pro") with a recurring
   $7.00/month price. Copy its price ID into `STRIPE_PRICE_ID_PRO`.
3. Developers → API keys → copy the secret key into `STRIPE_SECRET_KEY`.
4. Local webhook testing:
   ```bash
   npm run stripe:listen
   ```
   This prints a `whsec_...` signing secret — put it in
   `STRIPE_WEBHOOK_SECRET`.
5. In production, Developers → Webhooks → add endpoint
   `https://yourdomain.com/api/webhooks/stripe`, subscribed to:
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_failed`.

## 4. Lemon Squeezy (optional)

If you'd rather use Lemon Squeezy instead of (or alongside) Stripe:

1. Create a store and a $7/month subscription product/variant.
2. Store → Settings → Webhooks → add
   `https://yourdomain.com/api/webhooks/lemonsqueezy`, subscribed to
   `subscription_created`, `subscription_updated`,
   `subscription_cancelled`, `subscription_expired`,
   `subscription_payment_failed`. Copy the signing secret into
   `LEMONSQUEEZY_WEBHOOK_SECRET`.
3. When building your checkout URL/button, pass
   `checkout[custom][supabase_user_id]=<the logged-in user's id>` so the
   webhook can match the event back to a Supabase row.

## 5. Run

```bash
npm run dev
```

Visit `/signup`, create an account, add a transaction on `/dashboard`, and
hit `/pricing` to test checkout end to end (`stripe trigger
checkout.session.completed` also works against the local listener).

## 6. Deploy (free tier)

- Push to GitHub, import into Vercel (Hobby plan is free).
- Add every `.env.local` variable to Vercel's Project → Settings →
  Environment Variables.
- Set `NEXT_PUBLIC_SITE_URL` to your production domain.
- Point Stripe's/Lemon Squeezy's webhook endpoints at the deployed URL.

## File map

```
supabase/schema.sql              Full DB schema, triggers, RLS
types/database.ts                TS interfaces matching the schema
lib/supabase/{client,server}.ts  Browser + server Supabase clients
middleware.ts                    Route guard for /dashboard
app/login, app/signup            Auth pages
components/auth/*                Login/signup/logout components
app/dashboard/*                  Protected dashboard (layout = guard)
components/dashboard/*           Transaction tracker, streak score, checkout button
lib/cashflow.ts                  Net cash flow + gamified health score math
app/pricing/page.tsx             Pricing page ($0 / $7 plans)
app/api/checkout/route.ts        Creates a Stripe Checkout session
app/api/webhooks/stripe/route.ts        Stripe subscription webhook handler
app/api/webhooks/lemonsqueezy/route.ts  Lemon Squeezy webhook handler
lib/email.ts                     Logged email stub — wire in Resend/Postmark/SES
```
