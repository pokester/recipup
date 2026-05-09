import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
        Our story
      </p>
      <h1 className="mt-4 font-heading text-5xl leading-tight text-[var(--color-ink)]">
        We built Recipup because we couldn&apos;t find what we needed.
      </h1>

      <div className="mt-10 space-y-6 text-lg text-[var(--color-ink-soft)]">
        <p>
          It started simply: a dog with a sensitive stomach, a vet who said &quot;try home cooking&quot;, and no clear guide on where to actually begin. Most advice was either too vague to act on, or written for a completely different dog.
        </p>
        <p>
          What we wanted was something that knew our dog — their weight, their breed, their quirks — and built recipes around that. Not generic advice. Not guesswork. A proper plan.
        </p>
        <p>
          Recipup is what we built. It handles the nutritional thinking so you can focus on the cooking. You know exactly what goes in the bowl, why it&apos;s there, and how much to use. We do the hard work in the background.
        </p>
      </div>

      <div className="mt-14 border-t border-[var(--color-border)] pt-12">
        <h2 className="font-heading text-3xl text-[var(--color-ink)]">What we believe</h2>
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="font-semibold text-[var(--color-ink)]">You know exactly what&apos;s in it</h3>
            <p className="mt-2 text-[var(--color-ink-soft)]">Every ingredient is listed clearly, in plain English. No mystery content, no vague labelling — just real food you chose to put in the bowl.</p>
          </div>
          <div>
            <h3 className="font-semibold text-[var(--color-ink)]">Cooking is a feature, not a flaw</h3>
            <p className="mt-2 text-[var(--color-ink-soft)]">We know home cooking takes a bit more effort than ordering a delivery. We think that effort is worth something — both for your dog&apos;s health and your own peace of mind. Recipup makes that effort as small as possible.</p>
          </div>
          <div>
            <h3 className="font-semibold text-[var(--color-ink)]">Every life stage matters</h3>
            <p className="mt-2 text-[var(--color-ink-soft)]">Whether you&apos;re feeding a puppy building their immune system, an adult dog in peak condition, or a senior with changing needs — Recipup adjusts. No one-size-fits-all plans here.</p>
          </div>
          <div>
            <h3 className="font-semibold text-[var(--color-ink)]">We&apos;re not vets — and we say so</h3>
            <p className="mt-2 text-[var(--color-ink-soft)]">Recipup flags recipes that warrant a vet check and never makes medical claims. We&apos;re a knowledgeable friend who&apos;s done the research — not a clinical authority. When in doubt, we always say: ask your vet.</p>
          </div>
        </div>
      </div>

      <div className="mt-14 border-t border-[var(--color-border)] pt-12">
        <h2 className="font-heading text-3xl text-[var(--color-ink)]">Built for real life</h2>
        <p className="mt-4 text-lg text-[var(--color-ink-soft)]">
          Recipup works around how you actually cook — once a week, a couple of times a week, or fresh every day. It knows what you have in your kitchen, what equipment you own, and what your dog can and can&apos;t eat. It doesn&apos;t judge your budget or your schedule. It just builds the best plan it can with what you&apos;ve got.
        </p>
      </div>

      <div className="mt-14 rounded-3xl border border-[var(--color-border-strong)] bg-[var(--color-cream-soft)] px-8 py-8">
        <h2 className="font-heading text-3xl text-[var(--color-ink)]">Ready to start?</h2>
        <p className="mt-3 text-[var(--color-ink-soft)]">Build your dog&apos;s first recipe plan in a few minutes — no card required.</p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link href="/onboard" className="rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[var(--color-cream)] transition-transform hover:-translate-y-0.5">
            Build my dog&apos;s recipe plan →
          </Link>
          <Link href="/pricing" className="rounded-full border border-[var(--color-border-strong)] px-6 py-3 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-cream)]">
            See pricing
          </Link>
        </div>
      </div>
    </div>
  );
}
