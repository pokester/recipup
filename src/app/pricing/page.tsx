import Link from "next/link";
import { FaqAccordion } from "@/components/pricing/FaqAccordion";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const FREE_FEATURES = [
  "Up to 3 recipe generations/month",
  "Full recipe instructions",
  "Shopping list per recipe",
  "Save up to 5 recipes",
  "Pantry tracking",
];

const PACK_FEATURES = [
  "Unlimited recipe generations",
  "Meal planner",
  "Weekly shopping list",
  "Cost per day for every recipe",
  "Compare costs to delivery services",
  "Cost tracking over time",
  "All Free features",
];

const PACK_PRO_FEATURES = [
  "Everything in Pack",
  "Up to 6 dogs",
  "Health history dashboard",
  "Weekly nutrition graphs",
  "Smart recipe corrections",
  "Drift notifications",
];

const FOUNDING_FEATURES = [
  "Everything in Pack Pro",
  "Founding member pricing — forever",
  "Early access to every new feature",
  "Direct input on what we build next",
];

const FOUNDING_CAP = 500;

export default async function PricingPage() {
  let foundingCount = 0;
  try {
    const supabase = await createClient();
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("subscription_tier", "founding");
    foundingCount = count ?? 0;
  } catch {
    foundingCount = 0;
  }
  const foundingFull = foundingCount >= FOUNDING_CAP;
  const foundingSpotsLeft = Math.max(0, FOUNDING_CAP - foundingCount);

  return (
    <div>
      {/* ── HERO ── */}
      <section className="bg-[var(--color-sand)] py-12 text-center md:py-16">
        <div className="mx-auto max-w-3xl px-6">
          <p className="eyebrow">Pricing</p>
          <h1 className="mt-4 font-heading text-4xl leading-tight text-[var(--color-ink)]">
            Start free. Upgrade when you&apos;re ready.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[var(--color-ink-soft)]">
            Every account starts with a 14-day free trial of Pack Pro. No card required. Cancel any time.
          </p>
          <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-[var(--color-butter-light)] bg-[var(--color-butter-muted)] p-4">
            <p className="text-sm text-[var(--color-ink)]">
              Every account starts with 14 days of full Pack Pro access. At trial end, choose your plan — or use Recipup free.
            </p>
          </div>
        </div>
      </section>

      {/* ── TIER CARDS ── */}
      <section className="bg-[var(--color-warm-white)] py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Free */}
            <div className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-warm-white)] p-8">
              <p className="eyebrow">Free</p>
              <p className="mt-4 font-heading text-4xl text-[var(--color-ink)]">£0</p>
              <p className="text-sm text-[var(--color-ink-soft)]">per month</p>
              <p className="mt-4 text-sm text-[var(--color-ink-soft)]">
                Everything you need to try home cooking for your dog.
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[var(--color-ink-soft)]">
                    <span className="mt-0.5 shrink-0 text-[var(--color-coral)]">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-8 block rounded-full border border-[var(--color-border-strong)] px-5 py-3 text-center text-sm font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-sand)]"
              >
                Get started free →
              </Link>
            </div>

            {/* Pack — highlighted */}
            <div className="flex flex-col rounded-2xl bg-[var(--color-coral)] p-8">
              <div className="mb-3 self-start rounded-full bg-[var(--color-warm-white)] px-3 py-1 text-xs font-semibold text-[var(--color-coral)]">
                MOST POPULAR
              </div>
              <p className="eyebrow text-[var(--color-warm-white)]/70">Pack</p>
              <p className="mt-4 font-heading text-4xl text-[var(--color-warm-white)]">£1.09</p>
              <p className="text-sm text-[var(--color-warm-white)]/80">per month (£12.99/year)</p>
              <p className="mt-4 text-sm text-[var(--color-warm-white)]/90">
                For dog owners who want to plan, track, and cook with confidence.
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                {PACK_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[var(--color-warm-white)]/90">
                    <span className="mt-0.5 shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-8 block rounded-full bg-[var(--color-warm-white)] px-5 py-3 text-center text-sm font-semibold text-[var(--color-coral)] transition-transform hover:-translate-y-0.5"
              >
                Start 14-day free trial →
              </Link>
              <p className="mt-3 text-center text-xs text-[var(--color-warm-white)]/70">
                Trial gives you full Pack Pro access for 14 days. Then choose your plan.
              </p>
            </div>

            {/* Pack Pro */}
            <div className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-warm-white)] p-8">
              <p className="eyebrow">Pack Pro</p>
              <p className="mt-4 font-heading text-4xl text-[var(--color-ink)]">£2.08</p>
              <p className="text-sm text-[var(--color-ink-soft)]">per month (£24.99/year)</p>
              <p className="mt-4 text-sm text-[var(--color-ink-soft)]">For the dedicated dog parent.</p>
              <ul className="mt-6 flex-1 space-y-3">
                {PACK_PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[var(--color-ink-soft)]">
                    <span className="mt-0.5 shrink-0 text-[var(--color-coral)]">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-8 block rounded-full bg-[var(--color-coral)] px-5 py-3 text-center text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
              >
                Start 14-day free trial →
              </Link>
              <p className="mt-3 text-center text-xs text-[var(--color-ink-soft)]">
                No card required. Cancel any time.
              </p>
            </div>

            {/* Founding Member */}
            <div className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-warm-white)] p-8">
              <div className="mb-3 self-start rounded-full bg-[var(--color-forest-muted)] px-3 py-1 text-xs font-semibold text-[var(--color-forest)]">
                {foundingFull ? "FOUNDING CLOSED" : "FIRST 500 ONLY"}
              </div>
              <p className="eyebrow">Founding Member</p>
              <p className="mt-4 font-heading text-4xl text-[var(--color-ink)]">£1.50</p>
              <p className="text-sm text-[var(--color-ink-soft)]">per month (£17.99/yr) — locked forever</p>
              <p className="mt-1 text-xs text-[var(--color-ink-300)]">
                {foundingFull
                  ? "All 500 founding spots have been claimed."
                  : `${foundingCount} of ${FOUNDING_CAP} spots claimed — ${foundingSpotsLeft} remaining`}
              </p>
              <p className="mt-4 text-sm text-[var(--color-ink-soft)]">
                Join the first 500. Lock in the best price and help shape what Recipup becomes.
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                {FOUNDING_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[var(--color-ink-soft)]">
                    <span className="mt-0.5 shrink-0 text-[var(--color-coral)]">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              {foundingFull ? (
                <div className="mt-8 rounded-full border border-[var(--color-border)] px-5 py-3 text-center text-sm font-semibold text-[var(--color-ink-300)]">
                  Founding spots are full
                </div>
              ) : (
                <Link
                  href="/signup?plan=founding"
                  className="mt-8 block rounded-full bg-[var(--color-forest)] px-5 py-3 text-center text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
                >
                  Claim founding spot →
                </Link>
              )}
              <p className="mt-3 text-center text-xs text-[var(--color-ink-300)]">
                {foundingFull ? "See Pack or Pack Pro above." : "No card required. Cancel any time."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-[var(--color-sand)] py-12 md:py-20">
        <div className="mx-auto max-w-2xl px-6 md:px-10">
          <h2 className="mb-10 font-heading text-2xl text-[var(--color-ink)]">Common questions</h2>
          <FaqAccordion />
        </div>
      </section>

      {/* ── CLOSING CTA ── */}
      <section className="bg-[var(--color-forest)] py-12 text-center md:py-20">
        <div className="mx-auto max-w-xl px-6">
          <h2 className="font-heading text-3xl text-[var(--color-warm-white)]">
            Ready to start cooking for your dog?
          </h2>
          <p className="mt-4 text-[var(--color-warm-white)]/80">
            14 days free. No card required. Full access from day one.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-full bg-[var(--color-warm-white)] px-8 py-4 text-sm font-semibold text-[var(--color-forest)] transition-transform hover:-translate-y-0.5"
          >
            Create your free account →
          </Link>
          <p className="mt-4 text-sm text-[var(--color-warm-white)]/60">
            14-day free trial · No card required · Cancel any time
          </p>
        </div>
      </section>
    </div>
  );
}
