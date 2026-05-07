"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function Home() {
  const [email, setEmail] = useState("");
  const [submissions, setSubmissions] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    setSubmissions((current) => [...current, trimmedEmail]);
    setEmail("");
    setIsSubmitted(true);
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col px-6 pb-12 md:px-10 md:pb-16">
      <section className="flex flex-col gap-8 pt-16 pb-10 md:pt-24 md:pb-12">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
          PERSONALISED RECIPES FOR YOUR DOG
        </p>
        <div className="max-w-3xl">
          <h1 className="font-heading text-5xl leading-tight text-[var(--color-ink)] md:text-7xl">
            Feed your dog with recipes made from love, data, and real life.
          </h1>
        </div>
        <p className="max-w-2xl text-lg text-[var(--color-ink-soft)] md:text-2xl">
          Recipup creates tailored dog food recipes based on your pup&apos;s profile
          and your routine, so every bowl feels personal.
        </p>
        <div className="flex flex-wrap gap-4 pt-3">
          <Link
            href="/onboard"
            className="rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[var(--color-cream)] transition-transform hover:-translate-y-0.5"
          >
            Start your recipe
          </Link>
          <button className="rounded-full border border-[var(--color-border-strong)] px-6 py-3 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-cream-soft)]">
            See sample plans
          </button>
        </div>
      </section>

      <section className="border-t border-[var(--color-border)] pt-10 pb-16 md:pt-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
          How it works
        </p>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          <article className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
              Step 1
            </p>
            <h3 className="font-heading text-3xl text-[var(--color-ink)]">
              Tell us about your dog
            </h3>
            <p className="text-[var(--color-ink-soft)]">
              Share breed, age, weight, and any health context so we can
              personalise every recommendation.
            </p>
          </article>
          <article className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
              Step 2
            </p>
            <h3 className="font-heading text-3xl text-[var(--color-ink)]">
              We build your personalised nutrition plan
            </h3>
            <p className="text-[var(--color-ink-soft)]">
              Tell us your pup&apos;s details and we match them to perfectly
              balanced ingredients and portions built around your routine.
            </p>
          </article>
          <article className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
              Step 3
            </p>
            <h3 className="font-heading text-3xl text-[var(--color-ink)]">
              Get ready-to-cook recipes
            </h3>
            <p className="text-[var(--color-ink-soft)]">
              Receive cookbook-style instructions that make home cooking for your
              dog simple and joyful.
            </p>
          </article>
        </div>
      </section>

      <section className="border-t border-[var(--color-border)] py-16">
        <div className="rounded-3xl border border-[var(--color-border-strong)] bg-[var(--color-cream-soft)] px-6 py-8 md:px-10">
          <h2 className="font-heading text-4xl text-[var(--color-ink)] md:text-5xl">
            Be first. Feed better.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-[var(--color-ink-soft)]">
            Join the founding 500 and lock in lifetime founder pricing when
            Recipup launches.
          </p>
          <form
            onSubmit={handleSubmit}
            className="mt-6 flex flex-col gap-3 md:flex-row"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@doglover.com"
              className="h-12 flex-1 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-cream)] px-5 text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-soft)] focus:border-[var(--color-accent)]"
            />
            <button
              type="submit"
              className="h-12 rounded-full bg-[var(--color-accent)] px-7 text-sm font-semibold text-[var(--color-cream)] transition-transform hover:-translate-y-0.5"
            >
              Join waitlist
            </button>
          </form>
          {isSubmitted && submissions.length > 0 && (
            <p className="mt-4 text-sm text-[var(--color-ink-soft)]">
              You&apos;re on the list! We&apos;ll be in touch soon.
            </p>
          )}
        </div>
      </section>

      <section className="py-8">
        <p className="rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-accent)] px-6 py-6 text-center font-heading text-2xl leading-relaxed text-[var(--color-cream)] md:text-3xl">
          Home cooking saves dog owners EUR600-EUR1,200 a year on premium
          kibble. Recipup costs less than one bag.
        </p>
      </section>

      <footer className="border-t border-[var(--color-border)] py-10">
        <div className="flex flex-col items-start gap-3">
          <Logo height={36} />
          <p className="text-sm text-[var(--color-ink-soft)]">
            Real recipes. Happy pups.
          </p>
        </div>
      </footer>
    </div>
  );
}
