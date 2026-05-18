"use client";

import { useEffect } from "react";
import Link from "next/link";

const isDev = process.env.NODE_ENV === "development";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (isDev) console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-sand)] px-6">
      <div className="max-w-md text-center">
        <h2 className="mb-3 font-heading text-3xl text-[var(--color-ink)]">
          Something went wrong.
        </h2>
        <p className="mb-8 text-base text-[var(--color-ink-soft)]">
          An unexpected error occurred. Try refreshing the page — if it keeps
          happening, contact us at hello@recipup.co
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={reset}
            className="rounded-full bg-[var(--color-coral)] px-6 py-3 font-medium text-white transition-colors hover:bg-[var(--color-coral-dark)]"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-full border border-[var(--color-border-strong)] px-6 py-3 font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-warm-white)]"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
