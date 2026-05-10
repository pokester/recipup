"use client";

import { FormEvent, useState } from "react";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) return;
    setEmail("");
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <p className="text-sm text-[var(--color-ink-soft)]">
        You&apos;re on the list — we&apos;ll be in touch before we launch. Thank you.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="h-12 flex-1 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-cream)] px-5 text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-soft)] focus:border-[var(--color-accent)]"
      />
      <button
        type="submit"
        className="h-12 rounded-full bg-[var(--color-accent)] px-7 text-sm font-semibold text-[var(--color-cream)] transition-transform hover:-translate-y-0.5"
      >
        Reserve my spot →
      </button>
    </form>
  );
}
