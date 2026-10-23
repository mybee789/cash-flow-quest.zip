import type { Transaction } from "@/types/database";

export interface CashFlowSummary {
  totalIncomeCents: number;
  totalExpenseCents: number;
  netCents: number;
  transactionCount: number;
}

/**
 * Sums a list of transactions into income/expense/net totals.
 * Amounts are stored as positive integers in cents with a `type` flag,
 * so expenses are subtracted here rather than stored as negative numbers —
 * that keeps the DB column a simple positive check constraint.
 */
export function summarizeTransactions(transactions: Transaction[]): CashFlowSummary {
  return transactions.reduce<CashFlowSummary>(
    (acc, tx) => {
      if (tx.type === "income") {
        acc.totalIncomeCents += tx.amount_cents;
      } else {
        acc.totalExpenseCents += tx.amount_cents;
      }
      acc.netCents = acc.totalIncomeCents - acc.totalExpenseCents;
      acc.transactionCount += 1;
      return acc;
    },
    { totalIncomeCents: 0, totalExpenseCents: 0, netCents: 0, transactionCount: 0 }
  );
}

export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const dollars = Math.abs(cents) / 100;
  return `${sign}$${dollars.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export type HealthTier = "critical" | "shaky" | "steady" | "strong";

export interface HealthScore {
  score: number; // 0–100
  tier: HealthTier;
  label: string;
  message: string;
}

/**
 * Gamified "health score" blending three signals a gig worker actually
 * controls day to day:
 *  - runway: net cash relative to recent average daily spend
 *  - consistency: current logging streak (keeping the habit alive)
 *  - trend: whether the last 7 days net is better than the 7 before that
 *
 * This is intentionally simple and explainable — no black-box ML — so the
 * score a user sees always traces back to numbers they recognize.
 */
export function computeHealthScore(args: {
  last30: Transaction[];
  currentStreak: number;
}): HealthScore {
  const { last30, currentStreak } = args;
  const summary = summarizeTransactions(last30);

  const avgDailySpendCents =
    summary.totalExpenseCents > 0 ? summary.totalExpenseCents / 30 : 0;

  // Runway: how many days of net cash on hand at current burn rate, capped
  // at 30 for scoring purposes (30+ days reads as fully "strong").
  const runwayDays =
    avgDailySpendCents > 0
      ? Math.max(0, summary.netCents / avgDailySpendCents)
      : summary.netCents > 0
        ? 30
        : 0;
  const runwayScore = Math.min(1, runwayDays / 30) * 50;

  // Consistency: logging streak, capped at 14 days for full score.
  const streakScore = Math.min(1, currentStreak / 14) * 30;

  // Trend: split last30 into two 15-day halves and compare net.
  const midpoint = Math.floor(last30.length / 2);
  const recentHalf = summarizeTransactions(last30.slice(0, midpoint));
  const priorHalf = summarizeTransactions(last30.slice(midpoint));
  const improving = recentHalf.netCents >= priorHalf.netCents;
  const trendScore = improving ? 20 : 8;

  const score = Math.round(runwayScore + streakScore + trendScore);

  let tier: HealthTier;
  let label: string;
  let message: string;

  if (score >= 80) {
    tier = "strong";
    label = "Strong footing";
    message = "Your runway and habits are both solid. Keep logging daily to protect it.";
  } else if (score >= 55) {
    tier = "steady";
    label = "Steady ground";
    message = "You're holding steady. A few more good logging days will build real buffer.";
  } else if (score >= 30) {
    tier = "shaky";
    label = "Shaky footing";
    message = "Cash is tight relative to spend. Check which expenses can move or wait.";
  } else {
    tier = "critical";
    label = "Critical";
    message = "Runway is thin right now. Log today's numbers so you can see the real picture.";
  }

  return { score, tier, label, message };
}

export function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}
