// Matches supabase/schema.sql exactly. Keep in sync by hand, or generate
// with `supabase gen types typescript` once the project is linked.

export type Plan = "free" | "pro";
export type PlanStatus = "inactive" | "active" | "past_due" | "canceled";
export type TransactionType = "income" | "expense";

export const TRANSACTION_CATEGORIES = [
  "gig_payout",
  "client_invoice",
  "tips",
  "rent",
  "utilities",
  "groceries",
  "transport",
  "subscriptions",
  "debt_payment",
  "savings",
  "other",
] as const;

export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];

export interface AppUser {
  id: string;
  email: string;
  display_name: string | null;
  plan: Plan;
  plan_status: PlanStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  lemonsqueezy_customer_id: string | null;
  lemonsqueezy_subscription_id: string | null;
  current_streak: number;
  longest_streak: number;
  last_log_date: string | null; // ISO date
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  category: TransactionCategory | string;
  label: string;
  amount_cents: number;
  occurred_on: string; // ISO date
  is_recurring: boolean;
  notes: string | null;
  created_at: string;
}

export interface NewTransactionInput {
  type: TransactionType;
  category: TransactionCategory | string;
  label: string;
  amount_cents: number;
  occurred_on?: string;
  is_recurring?: boolean;
  notes?: string;
}

export interface StreakDay {
  id: string;
  user_id: string;
  log_date: string; // ISO date
  transactions_logged: number;
  net_cents: number;
  created_at: string;
}

// ----------------------------------------------------------------------------
// Supabase Database generic — plug into createClient<Database>(...)
// ----------------------------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      users: {
        Row: AppUser;
        Insert: Partial<AppUser> & { id: string; email: string };
        Update: Partial<AppUser>;
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Transaction>;
      };
      streaks: {
        Row: StreakDay;
        Insert: Omit<StreakDay, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<StreakDay>;
      };
    };
  };
}
