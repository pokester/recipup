import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Recipup",
  description: "How Recipup collects, uses, and protects account and dog profile information.",
};

const UPDATED_AT = "13 May 2026";

export default function PrivacyPage() {
  return (
    <main className="bg-[var(--color-warm-white)]">
      <section className="bg-[var(--color-sand)] py-12 md:py-16">
        <div className="mx-auto max-w-3xl px-6 md:px-8">
          <p className="eyebrow">Legal</p>
          <h1 className="mt-4 font-heading text-4xl text-[var(--color-ink)]">Privacy policy</h1>
          <p className="mt-3 text-sm text-[var(--color-ink-soft)]">Last updated: {UPDATED_AT}</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl space-y-8 px-6 py-12 text-sm leading-7 text-[var(--color-ink-soft)] md:px-8">
        <p>
          Recipup collects the information needed to run your account, create dog profiles, generate recipes,
          maintain saved recipes and meal plans, and provide account support.
        </p>

        <div>
          <h2 className="font-heading text-2xl text-[var(--color-ink)]">Information we collect</h2>
          <p className="mt-3">
            We may collect your name, email address, authentication details handled by Supabase, dog profile
            information, recipe preferences, pantry details, saved recipes, meal plans, and health logs you choose
            to enter.
          </p>
        </div>

        <div>
          <h2 className="font-heading text-2xl text-[var(--color-ink)]">How we use it</h2>
          <p className="mt-3">
            We use your information to provide personalised recipes, shopping lists, cost estimates, account access,
            product support, safety checks, and service improvements.
          </p>
        </div>

        <div>
          <h2 className="font-heading text-2xl text-[var(--color-ink)]">Third-party services</h2>
          <p className="mt-3">
            Recipup uses Supabase for authentication and data storage, and AI providers to generate recipe and meal
            planning output. We only send the information needed to provide those features.
          </p>
        </div>

        <div>
          <h2 className="font-heading text-2xl text-[var(--color-ink)]">Your choices</h2>
          <p className="mt-3">
            You can update or delete account data from your account area. If you need help, contact us at{" "}
            <a className="font-semibold text-[var(--color-accent)] hover:underline" href="mailto:hello@recipup.co">
              hello@recipup.co
            </a>
            .
          </p>
        </div>

        <div>
          <h2 className="font-heading text-2xl text-[var(--color-ink)]">Contact</h2>
          <p className="mt-3">
            Questions about privacy can be sent to{" "}
            <a className="font-semibold text-[var(--color-accent)] hover:underline" href="mailto:hello@recipup.co">
              hello@recipup.co
            </a>
            .
          </p>
        </div>

        <Link href="/" className="inline-block font-semibold text-[var(--color-accent)] hover:underline">
          Back to Recipup
        </Link>
      </section>
    </main>
  );
}
