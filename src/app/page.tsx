export default function Home() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16 md:px-10 md:py-24">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
        AI-powered personalized dog food plans
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
        <button className="rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[var(--color-cream)] transition-transform hover:-translate-y-0.5">
          Start your recipe
        </button>
        <button className="rounded-full border border-[var(--color-border-strong)] px-6 py-3 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-cream-soft)]">
          See sample plans
        </button>
      </div>
    </section>
  );
}
