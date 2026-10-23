import { createClient } from "@/lib/supabase/server";
import { TransactionTracker } from "@/components/dashboard/TransactionTracker";
import { StreakScore } from "@/components/dashboard/StreakScore";
import type { Transaction } from "@/types/database";

export const metadata = { title: "Dashboard — Cash Flow Quest" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null; // layout already redirects; satisfies TS

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString().slice(0, 10);

  const [{ data: transactions }, { data: profile }] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .gte("occurred_on", thirtyDaysAgoIso)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("users")
      .select("current_streak, longest_streak, plan")
      .eq("id", user.id)
      .single(),
  ]);

  const txs = (transactions ?? []) as Transaction[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-mist-100">
          Today&apos;s cash flow
        </h1>
        <p className="text-sm text-mist-500">
          Log every payout and expense as it happens — that&apos;s what keeps the
          score below honest.
        </p>
      </div>

      <StreakScore
        transactions={txs}
        currentStreak={(profile as any)?.current_streak ?? 0}
        longestStreak={(profile as any)?.longest_streak ?? 0}
      />

      <TransactionTracker userId={user.id} initialTransactions={txs} />
    </div>
  );
}
