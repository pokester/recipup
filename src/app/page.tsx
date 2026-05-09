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
          REAL FOOD. COOKED BY YOU.
        </p>
        <div className="max-w-3xl">
          <h1 className="font-heading text-5xl leading-tight text-[var(--color-ink)] md:text-7xl">
            Home-cooked food for your dog — built around them, made by you.
          </h1>
        </div>
        <p className="max-w-2xl text-lg text-[var(--color-ink-soft)] md:text-2xl">
          Recipup builds personalised recipe plans for your dog — from puppy to senior — based on who they are and how you cook. You know exactly what&apos;s in every bowl.
        </p>
        <div className="flex flex-wrap gap-4 pt-3">
          <Link
            href="/onboard"
            className="rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[var(--color-cream)] transition-transform hover:-translate-y-0.5"
          >
            Build my dog&apos;s recipe plan →
          </Link>
          <a href="#how-it-works" className="rounded-full border border-[var(--color-border-strong)] px-6 py-3 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-cream-soft)]">
            See how it works
          </a>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-[var(--color-border)] pt-10 pb-16 md:pt-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
          How it works
        </p>
        <h2 className="mt-3 font-heading text-3xl text-[var(--color-ink)]">Simple for you. Transformative for them.</h2>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          <article className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
              Step 1
            </p>
            <h3 className="font-heading text-3xl text-[var(--color-ink)]">
              Tell us about your dog
            </h3>
            <p className="text-[var(--color-ink-soft)]">
              Breed, age, weight, health conditions, what you cook with — share the full picture and we do the nutritional thinking for you.
            </p>
          </article>
          <article className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
              Step 2
            </p>
            <h3 className="font-heading text-3xl text-[var(--color-ink)]">
              We build their recipe plan
            </h3>
            <p className="text-[var(--color-ink-soft)]">
              Recipup works out their daily calorie needs, balances the nutrients, and builds recipes around your cooking style and what&apos;s already in your kitchen.
            </p>
          </article>
          <article className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
              Step 3
            </p>
            <h3 className="font-heading text-3xl text-[var(--color-ink)]">
              Cook, track, and improve
            </h3>
            <p className="text-[var(--color-ink-soft)]">
              Get clear, cookbook-style recipes with a shopping list ready to go. Save what works, refine over time, and watch your dog thrive.
            </p>
          </article>
        </div>
      </section>

      <section className="border-t border-[var(--color-border)] py-16">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] p-6">
            <p className="font-heading text-2xl text-[var(--color-ink)]">You know exactly what&apos;s in it</p>
            <p className="mt-3 text-[var(--color-ink-soft)]">Every ingredient, every gram — listed clearly. No mystery meals, no vague "natural flavourings." Just real food you chose.</p>
          </div>
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] p-6">
            <p className="font-heading text-2xl text-[var(--color-ink)]">We do the hard thinking</p>
            <p className="mt-3 text-[var(--color-ink-soft)]">Calorie targets, protein ratios, breed-specific adjustments, safe ingredient checks — all handled. You just cook the recipe.</p>
          </div>
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] p-6">
            <p className="font-heading text-2xl text-[var(--color-ink)]">Track the difference over time</p>
            <p className="mt-3 text-[var(--color-ink-soft)]">Save every recipe, plan your week, and see exactly what you&apos;re spending — then compare it to what delivery services cost for the same quality.</p>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--color-border)] py-16">
        <div className="rounded-3xl border border-[var(--color-border-strong)] bg-[var(--color-cream-soft)] px-6 py-8 md:px-10">
          <h2 className="font-heading text-4xl text-[var(--color-ink)] md:text-5xl">
            Be part of the founding pack.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-[var(--color-ink-soft)]">
            Join the first 500 dog owners and lock in founding member pricing for life. No card required to join — just your email.
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
          {isSubmitted && submissions.length > 0 && (
            <p className="mt-4 text-sm text-[var(--color-ink-soft)]">
              You&apos;re on the list — we&apos;ll be in touch before we launch. Thank you.
            </p>
          )}
          <p className="mt-3 text-xs text-[var(--color-ink-soft)]">No spam. Just one email when we&apos;re ready for you.</p>
        </div>
      </section>

      <section className="border-t border-[var(--color-border)] py-12">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {[
            "Breed-specific nutrition",
            "Pantry-aware recipes",
            "Shopping list included",
            "Safety score on every recipe",
            "Works for all life stages",
            "Vet-flag alerts built in",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-[var(--color-ink-soft)]">
              <span className="text-[var(--color-accent)]">✓</span>
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-[var(--color-border)] py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
          Fresh food. A fraction of the price.
        </p>
        <h2 className="mt-4 font-heading text-4xl text-[var(--color-ink)] md:text-5xl">
          Real ingredients. No delivery markup.
        </h2>
        <p className="mt-4 max-w-xl text-lg text-[var(--color-ink-soft)]">
          Fresh food delivery services are convenient — but you pay a significant premium for that convenience. Home cooking with Recipup gives your dog the same quality ingredients, cooked by you.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] p-6">
            <p className="text-sm font-semibold text-[var(--color-ink-soft)]">Fresh food delivery (premium)</p>
            <p className="mt-2 font-heading text-3xl text-[var(--color-ink)]">~£96/month</p>
            <p className="mt-1 text-sm text-[var(--color-ink-soft)]">for a 28kg dog</p>
          </div>

          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] p-6">
            <p className="text-sm font-semibold text-[var(--color-ink-soft)]">Fresh food delivery (standard)</p>
            <p className="mt-2 font-heading text-3xl text-[var(--color-ink)]">~£60/month</p>
            <p className="mt-1 text-sm text-[var(--color-ink-soft)]">for a 28kg dog</p>
          </div>

          <div className="rounded-3xl border-2 border-[var(--color-accent)] bg-[var(--color-accent)] p-6 text-[var(--color-cream)]">
            <p className="text-sm font-semibold text-[var(--color-cream)]/80">🐾 Recipup home cooking</p>
            <p className="mt-2 font-heading text-3xl">~£32–45/month</p>
            <p className="mt-1 text-sm text-[var(--color-cream)]/90">Same fresh ingredients. You do the cooking — we handle the rest.</p>
          </div>
        </div>

        <p className="mt-4 text-xs text-[var(--color-ink-soft)]">
          Competitor estimates are based on publicly listed pricing for a 28kg dog. Actual costs vary by weight, breed, and recipe.
        </p>
        <p className="mt-6 max-w-xl text-[var(--color-ink-soft)]">
          More dog owners are making the switch from expensive delivery to home cooking — without the guesswork. Recipup handles the nutritional thinking so you can focus on the cooking.
        </p>
      </section>

      <footer className="border-t border-[var(--color-border)] py-10">
        <div className="flex flex-col items-start gap-3">
          <Logo height={36} />
          <p className="text-sm text-[var(--color-ink-soft)]">
            Real recipes. Happy dogs.
          </p>
        </div>
      </footer>
    </div>
  );
}
