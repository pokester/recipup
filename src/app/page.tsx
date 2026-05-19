import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { withTimeout } from "@/lib/async";

export const dynamic = "force-dynamic";

function toTitleCase(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

export default async function Home() {
  let user = null;
  let firstName = "";
  let firstDogName = "";

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const supabase = await createClient();
      const { data } = await withTimeout(
        supabase.auth.getUser(),
        5000,
        "Home auth check timed out",
      );
      user = data.user;

      if (user) {
        const [{ data: profile }, { data: dogs }] = await Promise.all([
          withTimeout(
            supabase.from("profiles").select("full_name").eq("id", user.id).single(),
            5000,
            "Profile query timed out",
          ),
          withTimeout(
            supabase.from("dogs").select("name").eq("user_id", user.id).eq("is_active", true).order("created_at", { ascending: false }).limit(1),
            5000,
            "Dogs query timed out",
          ),
        ]);
        const rawName = (profile as { full_name: string | null } | null)?.full_name;
        firstName = rawName ? rawName.split(" ")[0] : (user.email?.split("@")[0] ?? "");
        firstDogName = toTitleCase((dogs as { name: string }[] | null)?.[0]?.name ?? "");
      }
    } catch {
      user = null;
    }
  }

  /* ── Logged-in experience (unchanged) ─────────────────────────── */
  if (user) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 pb-16 md:px-10">
        <section className="flex flex-col gap-6 pt-16 pb-10 md:pt-24 md:pb-12">
          <p className="eyebrow">Welcome back{firstName ? `, ${firstName}` : ""}</p>
          <div className="max-w-2xl">
            <h1 className="font-heading text-5xl leading-tight text-[var(--color-ink)] md:text-6xl">
              {firstDogName
                ? `What are you cooking for ${firstDogName} this week?`
                : "What are you cooking this week?"}
            </h1>
          </div>
          <p className="max-w-xl text-lg text-[var(--color-ink-soft)]">
            Build a new recipe plan, browse your library, or check in on your kitchen.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href="/onboard"
              className="rounded-full bg-[var(--color-coral)] px-6 py-3 text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
            >
              Build a recipe plan →
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full border border-[var(--color-border-strong)] px-6 py-3 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-sand)]"
            >
              Go to dashboard
            </Link>
          </div>
        </section>
      </div>
    );
  }

  /* ── Logged-out marketing pages ────────────────────────────────── */
  return (
    <div>
      {/* Schema.org SoftwareApplication markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Recipup",
            description:
              "Personalised home-cooked dog food recipe generator. Build recipes based on your dog's breed, age, weight, and health conditions.",
            applicationCategory: "HealthApplication",
            operatingSystem: "Web",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "GBP",
              description: "14-day free trial, no card required",
            },
          }),
        }}
      />

      {/* ── SECTION 1: HERO ── */}
      <section aria-label="Hero" className="bg-[var(--color-warm-white)] py-12 md:py-20">
        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
            {/* Left: content */}
            <div className="flex flex-col gap-6">
              <p className="eyebrow">Real food. Cooked by you.</p>
              <h1 className="font-heading text-3xl font-semibold leading-tight text-[var(--color-ink)] md:text-5xl">
                The freshest food your dog will ever eat — made in your kitchen.
              </h1>
              <p className="text-lg leading-relaxed text-[var(--color-ink-soft)]">
                Recipup builds personalised recipes for your dog based on exactly who they are. You cook with ingredients you chose. We handle the nutrition science.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/onboard"
                  className="rounded-full bg-[var(--color-coral)] px-6 py-3 text-center text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
                >
                  Build my dog&apos;s recipe plan →
                </Link>
                <a
                  href="#how-it-works"
                  className="rounded-full border border-[var(--color-border-strong)] px-6 py-3 text-center text-sm font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-sand)]"
                >
                  See how it works
                </a>
              </div>
            </div>

            {/* Right: recipe preview card — floats gently to signal a live product */}
            <div
              className="rounded-2xl bg-[var(--color-sand)] p-8 flex flex-col gap-5"
              style={{ animation: "float-card 5s ease-in-out infinite" }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-coral-muted)] font-heading text-sm font-semibold text-[var(--color-coral)]">R</div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">Rory&apos;s Wednesday recipe</p>
                  <p className="text-xs text-[var(--color-ink-500)]">Golden retriever · 28kg · Adult</p>
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                {[
                  { name: "Chicken breast", amount: "312g" },
                  { name: "Sweet potato", amount: "180g" },
                  { name: "Broccoli", amount: "95g" },
                  { name: "Sardines in spring water", amount: "50g" },
                  { name: "Sunflower oil", amount: "8ml" },
                ].map(({ name, amount }) => (
                  <div key={name} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-ink-500)]">{name}</span>
                    <span className="font-semibold text-[var(--color-ink)]">{amount}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[var(--color-coral-muted)] px-2.5 py-1 text-xs font-medium text-[var(--color-ink-700)]">31g protein</span>
                <span className="rounded-full bg-[var(--color-butter-muted)] px-2.5 py-1 text-xs font-medium text-[var(--color-ink-700)]">18g fat</span>
                <span className="rounded-full bg-[var(--color-forest-muted)] px-2.5 py-1 text-xs font-medium text-[var(--color-forest)]">Batch 7 days</span>
              </div>
              <div className="rounded-xl bg-[var(--color-forest-muted)] px-4 py-3">
                <p className="text-xs font-medium text-[var(--color-forest)]">FEDIAF compliant · 1,248 kcal target met</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: TRUST STRIP ── */}
      <section aria-label="Credentials" className="bg-[var(--color-forest)] py-4">
        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <div className="grid grid-cols-2 gap-2 text-center text-sm font-medium text-[var(--color-warm-white)] md:flex md:items-center md:justify-center md:gap-8">
            {[
              "Recipes to FEDIAF + AAFCO standards",
              "Breed-specific for 40+ breeds",
              "Puppies, adults & seniors",
              "Health conditions supported",
            ].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 3: HOW IT WORKS ── */}
      <section id="how-it-works" aria-label="How it works" className="bg-[var(--color-warm-white)] py-12 md:py-20">
        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <div className="text-center">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-3 font-heading text-3xl text-[var(--color-ink)]">
              Simple for you.<br />Transformative for them.
            </h2>
          </div>
          <div className="mt-12 grid gap-10 md:grid-cols-3">

            {/* Step 1 */}
            <article className="flex flex-col gap-4">
              <div className="rounded-2xl bg-[var(--color-sand)] p-6 flex flex-col gap-3">
                <span className="font-heading text-5xl font-semibold leading-none text-[var(--color-ink-100)]">1</span>
                <div className="mt-2 flex flex-col gap-2">
                  {([["Breed", "Golden Retriever"], ["Weight", "28 kg"], ["Life stage", "Adult"]] as const).map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between rounded-lg bg-[var(--color-warm-white)] px-3 py-2">
                      <span className="text-xs text-[var(--color-ink-500)]">{label}</span>
                      <span className="text-xs font-medium text-[var(--color-ink-500)]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="eyebrow">Step 1</p>
              <h3 className="font-heading text-2xl text-[var(--color-ink)]">Tell us about your dog</h3>
              <p className="text-[var(--color-ink-soft)]">Breed, age, weight, health conditions — the more we know, the better the recipes. Takes about two minutes.</p>
            </article>

            {/* Step 2 */}
            <article className="flex flex-col gap-4">
              <div className="rounded-2xl bg-[var(--color-sand-deep)] p-6 flex flex-col gap-3">
                <span className="font-heading text-5xl font-semibold leading-none text-[var(--color-ink-100)]">2</span>
                <div className="mt-2 flex flex-col gap-3">
                  {([
                    { label: "Protein", pct: 62, color: "bg-[var(--color-coral)]" },
                    { label: "Fat", pct: 27, color: "bg-[var(--color-butter)]" },
                    { label: "Fibre", pct: 11, color: "bg-[var(--color-sage)]" },
                  ]).map(({ label, pct, color }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="w-14 shrink-0 text-xs text-[var(--color-ink-500)]">{label}</span>
                      <div className="flex-1 overflow-hidden rounded-full bg-[var(--color-warm-white)] h-2">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 text-right text-xs font-medium text-[var(--color-ink-500)]">{pct}%</span>
                    </div>
                  ))}
                  <p className="text-xs text-[var(--color-forest)]">FEDIAF targets met</p>
                </div>
              </div>
              <p className="eyebrow">Step 2</p>
              <h3 className="font-heading text-2xl text-[var(--color-ink)]">We do the hard thinking</h3>
              <p className="text-[var(--color-ink-soft)]">Breed nutrition, calorie calculations, health condition rules, FEDIAF standards — all handled. You don&apos;t need a veterinary nutritionist.</p>
            </article>

            {/* Step 3 */}
            <article className="flex flex-col gap-4">
              <div className="rounded-2xl bg-[var(--color-forest-muted)] p-6 flex flex-col gap-3">
                <span className="font-heading text-5xl font-semibold leading-none text-[var(--color-ink-100)]">3</span>
                <div className="mt-2 flex flex-col gap-2.5">
                  {["Chicken breast — 312 g", "Sweet potato — 180 g", "Broccoli — 95 g"].map((ingredient) => (
                    <div key={ingredient} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-forest-light)]" aria-hidden="true" />
                      <span className="text-xs text-[var(--color-ink-500)]">{ingredient}</span>
                    </div>
                  ))}
                  <div className="mt-1 rounded-lg bg-[var(--color-forest)] px-3 py-2">
                    <p className="text-xs font-medium text-[var(--color-warm-white)]">One pot · 45 min · Feeds 7 days</p>
                  </div>
                </div>
              </div>
              <p className="eyebrow">Step 3</p>
              <h3 className="font-heading text-2xl text-[var(--color-ink)]">You cook it. They love it.</h3>
              <p className="text-[var(--color-ink-soft)]">One-pot recipes, exact gram amounts, batch cooking built in. One cook session feeds them for days.</p>
            </article>

          </div>
        </div>
      </section>

      {/* ── SECTION 4: THREE PILLARS ── */}
      <section aria-label="Why Recipup" className="bg-[var(--color-forest)] py-12 md:py-20">
        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <div className="text-center">
            <p className="eyebrow text-[var(--color-forest-muted)]">Why Recipup</p>
            <h2 className="mt-3 font-heading text-4xl text-[var(--color-warm-white)]">
              What makes home cooking different.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "You know every ingredient",
                body: "No factories. No mystery meat. No preservatives you can't pronounce. You chose what went in. You cooked it. That's something no delivery service can say.",
              },
              {
                title: "We've done the research",
                body: "Breed-specific nutrition, calorie targets, health condition rules, FEDIAF and AAFCO standards. We've built all of that in so you don't have to think about it.",
              },
              {
                title: "Track the difference",
                body: "Log your dog's weight, coat, and energy week by week. Know the recipes are working — don't just hope they are.",
              },
            ].map(({ title, body }) => (
              <div key={title} className="rounded-2xl bg-[var(--color-forest-light)] p-8">
                <h3 className="font-heading text-xl text-[var(--color-warm-white)]">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: COST COMPARISON ── */}
      <section aria-label="Pricing comparison" className="bg-[var(--color-warm-white)] py-12 md:py-20">
        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <div className="text-center">
            <p className="eyebrow">The honest numbers</p>
            <h2 className="mt-3 font-heading text-3xl text-[var(--color-ink)]">
              Same fresh ingredients.<br />A fraction of the price.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-[var(--color-ink-soft)]">
              Fresh food delivery services are convenient — but you&apos;re paying for packaging, cold chains, and logistics. Home cooking gives your dog the same ingredients for a fraction of the cost.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-sand)] p-6">
              <p className="text-sm font-semibold text-[var(--color-ink-soft)]">Fresh food delivery (premium)</p>
              <p className="mt-2 font-heading text-3xl text-[var(--color-ink)]">~£96/month</p>
              <p className="mt-1 text-sm text-[var(--color-ink-soft)]">for a 28kg dog</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-sand)] p-6">
              <p className="text-sm font-semibold text-[var(--color-ink-soft)]">Fresh food delivery (standard)</p>
              <p className="mt-2 font-heading text-3xl text-[var(--color-ink)]">~£60/month</p>
              <p className="mt-1 text-sm text-[var(--color-ink-soft)]">for a 28kg dog</p>
            </div>
            <div className="rounded-2xl bg-[var(--color-coral)] p-6">
              <p className="text-sm font-semibold text-[var(--color-warm-white)]"><span aria-hidden="true">🐾</span> Recipup home cooking</p>
              <p className="mt-2 font-heading text-3xl text-[var(--color-warm-white)]">~£32–45/month</p>
              <p className="mt-1 text-sm text-[var(--color-warm-white)]">Same ingredients. You do the (easy) cooking.</p>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-[var(--color-ink-500)]">
            Estimates based on publicly listed pricing for a 28kg dog. Actual costs vary by dog size, breed, and ingredients chosen.
          </p>
        </div>
      </section>

      {/* ── SECTION 6: FOUNDING CTA ── */}
      <section aria-label="Join Recipup" className="bg-[var(--color-sand)] py-12 md:py-20">
        <div className="mx-auto max-w-2xl px-6 md:px-10">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-warm-white)] p-8 text-center md:p-12">
            <p className="eyebrow">Founding 500</p>
            <h2 className="mt-3 font-heading text-3xl text-[var(--color-ink)]">Be part of something real.</h2>
            <p className="mx-auto mt-4 max-w-md text-[var(--color-ink-soft)]">
              We&apos;re opening to the first 500 members at a founding price locked in for life. Early access, direct input on what we build next, and the best price we&apos;ll ever offer.
            </p>
            <div className="mt-6">
              <Link
                href="/signup?plan=founding"
                className="inline-block rounded-full bg-[var(--color-coral)] px-8 py-4 text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
              >
                Claim your founding spot →
              </Link>
            </div>
            <p className="mt-3 text-xs text-[var(--color-ink-500)]">
              14-day free trial · No card required.
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION 7: TRUST SIGNALS ── */}
      <section aria-label="Features" className="bg-[var(--color-sand)] pb-12 md:pb-16">
        <div className="mx-auto max-w-6xl px-6 md:px-10">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {[
              "FEDIAF + AAFCO compliant recipes",
              "Breed intelligence for 40+ breeds",
              "Works for all life stages",
              "Health conditions handled",
              "No mystery ingredients",
              "Track progress over time",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-[var(--color-ink-soft)]">
                <span className="text-[var(--color-coral)]" aria-hidden="true">✓</span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
