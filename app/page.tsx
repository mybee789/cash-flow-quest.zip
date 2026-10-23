'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const handleCheckout = async () => {
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Error creating checkout session.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Could not connect to payment system.');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-4 text-center">
      <h1 className="font-display max-w-2xl text-4xl font-semibold text-mist-100 sm:text-5xl">
        Know your number before your paycheck does
      </h1>
      <p className="mt-4 max-w-md text-mist-500">
        A daily cash flow habit built for gig work – log what comes in and
        out, keep your streak, watch your health score climb.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/signup">
          <Button size="lg">Start free</Button>
        </Link>
        <Button size="lg" variant="secondary" onClick={handleCheckout}>
          See pricing
        </Button>
      </div>
    </main>
  );
}
