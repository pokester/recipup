import Link from "next/link";

export default function AboutPage() {
  return (
    <div>
      {/* ── HERO ── */}
      <section className="bg-[var(--color-sand)] py-12 md:py-20">
        <div className="mx-auto max-w-3xl px-6 text-center md:px-8">
          <p className="eyebrow">Our story</p>
          <h1 className="mt-4 font-heading text-4xl leading-tight text-[var(--color-ink)]">
            We built Recipup because we couldn&apos;t find what we needed.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--color-ink-soft)]">
            It started simply: a dog with a sensitive stomach, a vet who said &ldquo;try home cooking&rdquo;, and no clear guide on where to actually begin.
          </p>
        </div>
      </section>

      {/* ── STORY ── */}
      <section className="bg-[var(--color-warm-white)] py-12 md:py-20">
        <div className="mx-auto max-w-2xl space-y-6 px-6 text-lg text-[var(--color-ink-soft)] md:px-8">
          <p>
            What we wanted was something that knew our dog — their weight, their breed, their quirks — and built recipes around that. Not generic advice. Not guesswork. A proper plan.
          </p>
          <p>
            Recipup is what we built. It handles the nutritional thinking so you can focus on the cooking. You know exactly what goes in the bowl, why it&apos;s there, and how much to use. We do the hard work in the background.
          </p>
          <p>
            Unlike fresh food delivery services, we don&apos;t cook anything. You do. That&apos;s not a limitation — it&apos;s the point. You choose the ingredients. You cook the meal. You know exactly what your dog is eating. And because you&apos;re not paying for packaging, cold chain logistics, and a delivery network, you spend a fraction of the cost.
          </p>
        </div>
      </section>

      {/* ── BELIEFS ── */}
      <section className="bg-[var(--color-forest)] py-12 md:py-20">
        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <div className="text-center">
            <p className="eyebrow" style={{ color: "var(--color-forest-light)" }}>What we believe</p>
            <h2 className="mt-3 font-heading text-3xl text-[var(--color-warm-white)]">
              Every decision we make starts here.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {[
              {
                title: "You know exactly what's in it",
                body: "Every ingredient, every gram — listed clearly, in plain English. No mystery content, no vague labelling. Just real food you put in the bowl.",
              },
              {
                title: "Cooking is a feature, not a flaw",
                body: "We know home cooking takes a little more effort than ordering a delivery. We think that effort is worth something — for your dog's health and your own peace of mind. Recipup makes that effort as small as possible.",
              },
              {
                title: "The science should be invisible",
                body: "Breed nutrition, calorie targets, FEDIAF standards — none of that should be your problem. You tell us about your dog. We handle everything else.",
              },
              {
                title: "Track it to trust it",
                body: "Recipes are only valuable if they work. That's why we built health tracking in — so you can see your dog's weight, coat, and energy improve over time.",
              },
            ].map(({ title, body }) => (
              <div key={title} className="rounded-2xl bg-[var(--color-forest-light)] p-8">
                <h3 className="font-heading text-xl text-[var(--color-warm-white)]">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--color-warm-white)]/80">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST SIGNALS ── */}
      <section className="bg-[var(--color-sand)] py-16">
        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { stat: "40+", label: "breeds supported" },
              { stat: "FEDIAF + AAFCO", label: "compliant" },
              { stat: "All", label: "life stages" },
              { stat: "8+", label: "health conditions handled" },
            ].map(({ stat, label }) => (
              <div
                key={label}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-warm-white)] p-6 text-center"
              >
                <p className="font-heading text-2xl text-[var(--color-ink)]">{stat}</p>
                <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-[var(--color-warm-white)] py-12 text-center md:py-20">
        <div className="mx-auto max-w-xl px-6">
          <h2 className="font-heading text-3xl text-[var(--color-ink)]">Recipup is for every dog.</h2>
          <p className="mx-auto mt-4 text-[var(--color-ink-soft)]">
            Every breed, every age, every health condition. If they eat, we can help you cook for them better.
          </p>
          <Link
            href="/onboard"
            className="mt-8 inline-block rounded-full bg-[var(--color-coral)] px-8 py-3 text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
          >
            Build your first recipe plan →
          </Link>
        </div>
      </section>
    </div>
  );
}
