"use client";

import { useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  formatCents,
  isoToday,
  summarizeTransactions,
} from "@/lib/cashflow";
import { TRANSACTION_CATEGORIES } from "@/types/database";
import type { Transaction, TransactionType } from "@/types/database";

export function TransactionTracker({
  userId,
  initialTransactions,
}: {
  userId: string;
  initialTransactions: Transaction[];
}) {
  const supabase = createClient();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [type, setType] = useState<TransactionType>("income");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("gig_payout");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const summary = useMemo(() => summarizeTransactions(transactions), [transactions]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedAmount = Number.parseFloat(amount);
    if (!label.trim()) {
      setError("Give it a short label, like \"Uber payout\" or \"Groceries\".");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter an amount greater than $0.");
      return;
    }

    const amount_cents = Math.round(parsedAmount * 100);
    const optimisticTx: Transaction = {
      id: `optimistic-${Date.now()}`,
      user_id: userId,
      type,
      category,
      label: label.trim(),
      amount_cents,
      occurred_on: isoToday(),
      is_recurring: false,
      notes: null,
      created_at: new Date().toISOString(),
    };

    // Optimistic update so the health score and list feel instant —
    // reconciled with the real row (or rolled back) once the insert resolves.
    setTransactions((prev) => [optimisticTx, ...prev]);
    setLabel("");
    setAmount("");

    startTransition(async () => {
      const { data, error: insertError } = await (supabase
        .from("transactions") as any)
        .insert({
          user_id: userId,
          type,
          category,
          label: optimisticTx.label,
          amount_cents,
          occurred_on: optimisticTx.occurred_on,
        })
        .select()
        .single();

      if (insertError || !data) {
        setError(insertError?.message ?? "Couldn't save that — try again.");
        setTransactions((prev) => prev.filter((t) => t.id !== optimisticTx.id));
        return;
      }

      setTransactions((prev) =>
        prev.map((t) => (t.id === optimisticTx.id ? (data as Transaction) : t))
      );
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Log a transaction</CardTitle>
          <CardDescription>Takes five seconds. Do it as it happens.</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="flex rounded-quest border border-ink-600 p-1">
            {(["income", "expense"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 rounded-[8px] py-1.5 text-sm font-medium capitalize transition-colors ${
                  type === t
                    ? t === "income"
                      ? "bg-quest-teal text-ink-950"
                      : "bg-quest-coral text-ink-950"
                    : "text-mist-500 hover:text-mist-100"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div>
            <Label htmlFor="tx-label">What is it?</Label>
            <Input
              id="tx-label"
              placeholder={type === "income" ? "Uber payout" : "Groceries"}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tx-amount">Amount (USD)</Label>
              <Input
                id="tx-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="tx-category">Category</Label>
              <select
                id="tx-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 w-full rounded-quest border border-ink-600 bg-ink-900 px-3 text-sm text-mist-100 focus:border-quest-teal focus:outline-none focus:ring-1 focus:ring-quest-teal"
              >
                {TRANSACTION_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-quest-coral">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" isLoading={isPending}>
            Add {type}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Last 30 days</CardTitle>
            <CardDescription>
              {formatCents(summary.totalIncomeCents)} in · {formatCents(summary.totalExpenseCents)} out
            </CardDescription>
          </div>
          <p
            className={`font-display text-xl font-semibold ${
              summary.netCents >= 0 ? "text-quest-teal" : "text-quest-coral"
            }`}
          >
            {formatCents(summary.netCents)}
          </p>
        </CardHeader>

        {transactions.length === 0 ? (
          <p className="py-8 text-center text-sm text-mist-500">
            Nothing logged yet. Add your first transaction to start the streak.
          </p>
        ) : (
          <ul className="divide-y divide-ink-700">
            {transactions.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-mist-100">{tx.label}</p>
                  <p className="text-xs text-mist-500">
                    {tx.category.replace(/_/g, " ")} · {tx.occurred_on}
                  </p>
                </div>
                <p
                  className={`text-sm font-medium ${
                    tx.type === "income" ? "text-quest-teal" : "text-quest-coral"
                  }`}
                >
                  {tx.type === "income" ? "+" : "-"}
                  {formatCents(tx.amount_cents)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
