"use client";

import { useState } from "react";
import Link from "next/link";

const DISMISSED_KEY = "trial_banner_dismissed_until";

export function TrialBanner({ daysLeft }: { daysLeft: number }) {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const dismissedUntil = localStorage.getItem(DISMISSED_KEY);
      return !(dismissedUntil && new Date(dismissedUntil) > new Date());
    } catch {
      return true;
    }
  });

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
    <div className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4">
      <p className="text-sm font-semibold text-amber-900">
        {daysLeft} day{daysLeft !== 1 ? "s" : ""} left in your free trial.
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="/pricing"
          className="rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-xs font-semibold text-[var(--color-cream)]"
        >
          Upgrade to keep everything →
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="text-xs text-amber-700 hover:text-amber-900"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
