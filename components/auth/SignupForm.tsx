"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export function SignupForm() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password needs to be at least 8 characters.");
      return;
    }

    setIsLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    setIsLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // If email confirmation is on, Supabase returns a user with no session.
    if (data.user && !data.session) {
      setCheckEmail(true);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (checkEmail) {
    return (
      <Card className="w-full max-w-sm text-center">
        <h1 className="font-display mb-2 text-2xl font-semibold text-mist-100">
          Check your inbox
        </h1>
        <p className="text-sm text-mist-500">
          We sent a confirmation link to <strong className="text-mist-100">{email}</strong>.
          Click it to activate your account.
        </p>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <h1 className="font-display mb-1 text-2xl font-semibold text-mist-100">
        Start your streak
      </h1>
      <p className="mb-6 text-sm text-mist-500">
        Free to start. No card required until you upgrade.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-quest-coral">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-mist-500">
        Already have an account?{" "}
        <Link href="/login" className="text-quest-teal hover:underline">
          Log in
        </Link>
      </p>
    </Card>
  );
}
