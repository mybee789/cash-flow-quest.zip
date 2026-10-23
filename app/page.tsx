import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-4 text-center">
      <h1 className="font-display max-w-2xl text-4xl font-semibold text-mist-100 sm:text-5xl">
        Know your number before your paycheck does
      </h1>
      <p className="mt-4 max-w-md text-mist-500">
        A daily cash flow habit built for gig work — log what comes in and
        out, keep your streak, watch your health score climb.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/signup">
          <Button size="lg">Start free</Button>
        </Link>
        <Link href="/pricing">
          <Button size="lg" variant="secondary">
            See pricing
          </Button>
        </Link>
      </div>
    </main>
  );
}
