import { SignupForm } from "@/components/auth/SignupForm";

export const metadata = { title: "Sign up — Cash Flow Quest" };

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-950 px-4">
      <SignupForm />
    </main>
  );
}
