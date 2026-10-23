"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CheckoutButton({
  label = "Upgrade to Pro — $7/mo",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Couldn't start checkout.");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsLoading(false);
    }
  }

  return (
    <div className={className}>
      <Button size="lg" className="w-full" onClick={handleClick} isLoading={isLoading}>
        {label}
      </Button>
      {error ? <p className="mt-2 text-sm text-quest-coral">{error}</p> : null}
    </div>
  );
}
