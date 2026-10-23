"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { computeHealthScore, formatCents, summarizeTransactions } from "@/lib/cashflow";
import type { Transaction } from "@/types/database";
import type { HealthTier } from "@/lib/cashflow";

const TIER_COLORS: Record<HealthTier, string> = {
  critical: "text-quest-coral",
  shaky: "text-quest-amber",
  steady: "text-quest-teal",
  strong: "text-quest-teal",
};

const TIER_RING: Record<HealthTier, string> = {
  critical: "stroke-quest-coral",
  shaky: "stroke-quest-amber",
  steady: "stroke-quest-teal",
  strong: "stroke-quest-teal",
};

export function StreakScore({
  transactions,
  currentStreak,
  longestStreak,
}: {
  transactions: Transaction[];
  currentStreak: number;
  longestStreak: number;
}) {
  const health = useMemo(
    () => computeHealthScore({ last30: transactions, currentStreak }),
    [transactions, currentStreak]
  );
  const summary = useMemo(() => summarizeTransactions(transactions), [transactions]);

  // Circle math for the score ring (SVG, no external chart lib needed).
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - health.score / 100);

  return (
    <Card>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-[auto_1fr]">
        <div className="flex items-center justify-center">
          <div className="relative h-28 w-28">
            <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-ink-700"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className={`${TIER_RING[health.tier]} transition-[stroke-dashoffset] duration-700 ease-out`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`font-display text-2xl font-bold ${TIER_COLORS[health.tier]}`}>
                {health.score}
              </span>
              <span className="text-[11px] text-mist-500">health</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-3">
          <div>
            <p className={`font-display text-lg font-semibold ${TIER_COLORS[health.tier]}`}>
              {health.label}
            </p>
            <p className="text-sm text-mist-500">{health.message}</p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-mist-500">30-day net</p>
              <p className="font-medium text-mist-100">{formatCents(summary.netCents)}</p>
            </div>
            <div>
              <p className="text-mist-500">Current streak</p>
              <p className="font-medium text-mist-100">
                {currentStreak} {currentStreak === 1 ? "day" : "days"} 🔥
              </p>
            </div>
            <div>
              <p className="text-mist-500">Longest streak</p>
              <p className="font-medium text-mist-100">{longestStreak} days</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
