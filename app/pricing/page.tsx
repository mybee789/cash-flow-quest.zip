import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CheckoutButton } from "@/components/dashboard/CheckoutButton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Pricing — Cash Flow Quest" };

const FREE_FEATURES = [
  "Unlimited manual income & expense logging",
  "30-day cash flow view",
  "Daily logging streak tracking",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Full history & trend charts",
  "Health score with 7-day trend detection",
  "Low-balance and streak-risk email alerts",
  "Priority support",
];

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-ink-950 px-4 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="font-display text-3xl font-semibold text-mist-100 sm:text-4xl">
          One number to watch, every day
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-mist-500">
          Built for irregular paychecks — gig work, freelancing, tips. Log what
          comes in and out, keep your streak alive, and know your health score
          before you check your actual bank balance.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
        <Card className="flex flex-col">
          <div className="mb-4">
            <p className="font-display text-lg font-semibold text-mist-100">Free</p>
            <p className="mt-1">
              <span className="font-display text-3xl font-bold text-mist-100">$0</span>
              <span className="text-mist-500"> /month</span>
            </p>
          </div>
          <ul className="mb-6 flex-1 space-y-2 text-sm text-mist-300">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-quest-teal">✓</span> {f}
              </li>
            ))}
          </ul>
          {user ? (
            <Link href="/dashboard">
              <Button variant="secondary" className="w-full">
                Go to dashboard
              </Button>
            </Link>
          ) : (
            <Link href="/signup">
              <Button variant="secondary" className="w-full">
                Start free
              </Button>
            </Link>
          )}
        </Card>

        <Card className="relative flex flex-col border-quest-teal/40">
          <span className="absolute -top-3 right-5 rounded-full bg-quest-amber px-2.5 py-0.5 text-xs font-semibold text-ink-950">
            Most chosen
          </span>
          <div className="mb-4">
            <p className="font-display text-lg font-semibold text-mist-100">Pro</p>
            <p className="mt-1">
              <span className="font-display text-3xl font-bold text-mist-100">$7</span>
              <span className="text-mist-500"> /month</span>
            </p>
          </div>
          <ul className="mb-6 flex-1 space-y-2 text-sm text-mist-300">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-quest-teal">✓</span> {f}
              </li>
            ))}
          </ul>
          {user ? (
            <CheckoutButton />
          ) : (
            <Link href="/signup?next=/pricing">
              <Button className="w-full">Create an account to upgrade</Button>
            </Link>
          )}
        </Card>
      </div>

      <p className="mt-8 text-center text-xs text-mist-500">
        Cancel anytime from your billing portal. No long-term contract.
      </p>
    </main>
  );
}
