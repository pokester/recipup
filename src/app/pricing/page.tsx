import Link from "next/link";

const FREE_FEATURES = [
  "Up to 3 recipe generations per month",
  "Full recipe instructions and ingredient lists",
  "Shopping list per recipe",
  "Save recipes to your library",
  "Pantry and equipment tracking",
];

const PACK_FEATURES = [
  "Unlimited recipe generations",
  "Meal planner — plan your dog's week",
  "Weekly shopping list",
  "Cost per day for every recipe",
  "Compare costs to fresh food delivery services",
  "Cost tracking over time",
  "All Free features included",
];

const PACK_PRO_FEATURES = [
  "Everything in Pack",
  "Up to 6 dogs",
  "Health history dashboard",
  "Weekly nutrition graphs",
  "Smart correction suggestions",
  "Drift notifications",
];

const FOUNDING_FEATURES = [
  "Everything in Pack",
  "Locked-in founding member pricing — forever",
  "Early access to every new feature",
  "Direct input on what we build next",
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16 md:px-8">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
          Pricing
        </p>
        <h1 className="mt-4 font-heading text-5xl leading-tight text-[var(--color-ink)]">
          Start free. Upgrade when you&apos;re ready.
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-[var(--color-ink-soft)]">
          Every account starts with a 14-day free trial of Pack. No card required. Downgrade, upgrade, or cancel any time.
        </p>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Free */}
        <div className="flex flex-col rounded-3xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] p-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-soft)]">Free</p>
            <p className="mt-3 font-heading text-4xl text-[var(--color-ink)]">£0</p>
            <p className="text-sm text-[var(--color-ink-soft)]">per month</p>
            <p className="mt-4 text-sm text-[var(--color-ink-soft)]">Everything you need to try home cooking for your dog.</p>
          </div>
          <ul className="mt-6 flex-1 space-y-3">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-[var(--color-ink-soft)]">
                <span className="mt-0.5 text-[var(--color-accent)]">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <Link href="/signup" className="mt-8 block rounded-full border border-[var(--color-border-strong)] px-5 py-3 text-center text-sm font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-cream)]">
            Get started free →
          </Link>
        </div>

        {/* Pack */}
        <div className="flex flex-col rounded-3xl border-2 border-[var(--color-accent)] bg-[var(--color-accent)] p-7 text-[var(--color-cream)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-cream)]/70">Pack</p>
            <p className="mt-3 font-heading text-4xl">£1.09</p>
            <p className="text-sm text-[var(--color-cream)]/80">per month</p>
            <p className="mt-4 text-sm text-[var(--color-cream)]/90">For dog owners who want to plan, track, and cook with confidence.</p>
          </div>
          <ul className="mt-6 flex-1 space-y-3">
            {PACK_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-[var(--color-cream)]/90">
                <span className="mt-0.5">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <Link href="/signup" className="mt-8 block rounded-full bg-[var(--color-cream)] px-5 py-3 text-center text-sm font-semibold text-[var(--color-accent)] transition-transform hover:-translate-y-0.5">
            Start 14-day free trial →
          </Link>
          <p className="mt-3 text-center text-xs text-[var(--color-cream)]/70">No card required. Cancel any time.</p>
        </div>

        {/* Pack Pro */}
        <div className="flex flex-col rounded-3xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] p-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-soft)]">Pack Pro</p>
            <p className="mt-3 font-heading text-4xl text-[var(--color-ink)]">£2.08</p>
            <p className="text-sm text-[var(--color-ink-soft)]">per month <span className="text-xs">(€24.99/yr)</span></p>
            <p className="mt-4 text-sm text-[var(--color-ink-soft)]">For the dedicated dog parent.</p>
          </div>
          <ul className="mt-6 flex-1 space-y-3">
            {PACK_PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-[var(--color-ink-soft)]">
                <span className="mt-0.5 text-[var(--color-accent)]">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <Link href="/signup" className="mt-8 block rounded-full border border-[var(--color-border-strong)] px-5 py-3 text-center text-sm font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-cream)]">
            Start 14-day free trial →
          </Link>
          <p className="mt-3 text-center text-xs text-[var(--color-ink-soft)]">No card required. Cancel any time.</p>
        </div>

        {/* Founding */}
        <div className="flex flex-col rounded-3xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] p-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">Founding Member</p>
            <p className="mt-3 font-heading text-4xl text-[var(--color-ink)]">£1.50</p>
            <p className="text-sm text-[var(--color-ink-soft)]">per month <span className="text-xs">(€17.99/yr)</span>, locked in forever</p>
            <p className="mt-4 text-sm text-[var(--color-ink-soft)]">Join the first 500. Lock in the best price — and help shape what Recipup becomes.</p>
          </div>
          <ul className="mt-6 flex-1 space-y-3">
            {FOUNDING_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-[var(--color-ink-soft)]">
                <span className="mt-0.5 text-[var(--color-accent)]">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <Link href="/signup" className="mt-8 block rounded-full bg-[var(--color-accent)] px-5 py-3 text-center text-sm font-semibold text-[var(--color-cream)] transition-transform hover:-translate-y-0.5">
            Claim founding spot →
          </Link>
          <p className="mt-3 text-center text-xs text-[var(--color-ink-soft)]">Limited to the first 500 members.</p>
        </div>
      </div>

      <div className="mt-14 rounded-3xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] p-8">
        <h2 className="font-heading text-2xl text-[var(--color-ink)]">Common questions</h2>
        <div className="mt-6 space-y-6">
          <div>
            <h3 className="font-semibold text-[var(--color-ink)]">What happens at the end of my trial?</h3>
            <p className="mt-2 text-sm text-[var(--color-ink-soft)]">Your account moves to the Free plan automatically — no charges, no surprises. You keep everything you saved. Upgrade when you&apos;re ready.</p>
          </div>
          <div>
            <h3 className="font-semibold text-[var(--color-ink)]">Can I use Recipup for more than one dog?</h3>
            <p className="mt-2 text-sm text-[var(--color-ink-soft)]">Yes. You can add multiple dogs and build separate recipe plans for each. Every profile is independent.</p>
          </div>
          <div>
            <h3 className="font-semibold text-[var(--color-ink)]">Is Recipup suitable for puppies and senior dogs?</h3>
            <p className="mt-2 text-sm text-[var(--color-ink-soft)]">Yes — Recipup adjusts calorie targets and nutrition guidelines for all life stages, from puppies through to seniors. Just tell us your dog&apos;s age and we handle the rest.</p>
          </div>
          <div>
            <h3 className="font-semibold text-[var(--color-ink)]">Do I need to be a confident cook?</h3>
            <p className="mt-2 text-sm text-[var(--color-ink-soft)]">Not at all. Recipup gives you clear, step-by-step instructions built around your cooking equipment and how often you want to cook. If you can boil water, you can follow a Recipup recipe.</p>
          </div>
        </div>
      </div>

      <div className="mt-10 text-center">
        <p className="text-sm text-[var(--color-ink-soft)]">
          Questions? <Link href="/about" className="font-semibold text-[var(--color-accent)] hover:underline">Read more about us</Link> or{" "}
          <a href="mailto:hello@recipup.co" className="font-semibold text-[var(--color-accent)] hover:underline">get in touch</a>.
        </p>
      </div>
    </div>
  );
}
