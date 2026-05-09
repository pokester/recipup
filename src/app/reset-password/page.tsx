"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/auth/callback?next=/account` },
    );
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  };

  return (
    <div className="mx-auto w-full max-w-md px-6 py-16 md:py-24">
      <div className="mb-10 text-center">
        <div className="mb-6 flex justify-center">
          <Logo height={44} />
        </div>
        <h1 className="font-heading text-4xl text-[var(--color-ink)]">
          Reset your password
        </h1>
        <p className="mt-2 text-[var(--color-ink-soft)]">
          Enter your email and we&apos;ll send you a link to reset it.
        </p>
      </div>

      {sent ? (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] px-6 py-8 text-center">
          <p className="font-heading text-2xl text-[var(--color-ink)]">Check your inbox</p>
          <p className="mt-3 text-[var(--color-ink-soft)]">
            Check your inbox — the link is on its way. It may take a minute or two.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm font-semibold text-[var(--color-accent)] hover:underline"
          >
            ← Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <label className="block space-y-1.5">
            <span className="text-sm text-[var(--color-ink-soft)]">Email address</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-cream)] px-4 outline-none focus:border-[var(--color-accent)]"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-full bg-[var(--color-accent)] text-sm font-semibold text-[var(--color-cream)] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-accent)]"
            >
              ← Back to sign in
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
