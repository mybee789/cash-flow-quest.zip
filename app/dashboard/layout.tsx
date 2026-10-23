import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/LogoutButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware already redirects unauthenticated requests away from
  // /dashboard, but every protected layout re-checks server-side too —
  // middleware matchers can be edited later and should never be the only
  // guard in front of real user data.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("display_name, plan, current_streak")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-ink-950">
      <header className="border-b border-ink-700">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="font-display text-lg font-semibold text-mist-100">
            Cash Flow Quest
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-mist-500">
              {profile?.display_name ?? user.email}
              {profile?.plan === "pro" ? (
                <span className="ml-2 rounded-full bg-quest-amber/15 px-2 py-0.5 text-xs font-medium text-quest-amber">
                  Pro
                </span>
              ) : null}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
