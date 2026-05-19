"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DISMISSED_KEY = "trial_banner_dismissed_until";

export function TrialBanner({ daysLeft }: { daysLeft: number }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    try {
      const dismissedUntil = localStorage.getItem(DISMISSED_KEY);
      if (dismissedUntil && new Date(dismissedUntil) > new Date()) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVisible(false);
      }
    } catch {
      // ignore
    }
  }, []);

  const dismiss = () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      localStorage.setItem(DISMISSED_KEY, tomorrow.toISOString());
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-[var(--color-butter-light)] bg-[var(--color-butter-muted)] px-5 py-4">
      <p className="text-sm font-semibold text-[var(--color-ink)]">
        {daysLeft} day{daysLeft !== 1 ? "s" : ""} left in your free trial.
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="/pricing"
          className="rounded-full bg-[var(--color-coral)] px-4 py-1.5 text-xs font-semibold text-[var(--color-warm-white)]"
        >
          Upgrade to keep everything →
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="text-xs text-[var(--color-ink-500)] hover:text-[var(--color-ink)]"
          aria-label="Dismiss"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" d="M3 3l10 10M13 3L3 13" />
          </svg>
        </button>
      </div>
    </div>
  );
}
