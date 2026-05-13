import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use | Recipup",
  description: "Terms for using Recipup recipes, planning tools, and account features.",
};

const UPDATED_AT = "13 May 2026";

export default function TermsPage() {
  return (
    <main className="bg-[var(--color-warm-white)]">
      <section className="bg-[var(--color-sand)] py-12 md:py-16">
        <div className="mx-auto max-w-3xl px-6 md:px-8">
          <p className="eyebrow">Legal</p>
          <h1 className="mt-4 font-heading text-4xl text-[var(--color-ink)]">Terms of use</h1>
          <p className="mt-3 text-sm text-[var(--color-ink-soft)]">Last updated: {UPDATED_AT}</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl space-y-8 px-6 py-12 text-sm leading-7 text-[var(--color-ink-soft)] md:px-8">
        <p>
          These terms apply when you use Recipup. By using the service, you agree to use it responsibly and only for
          lawful purposes.
        </p>

        <div>
          <h2 className="font-heading text-2xl text-[var(--color-ink)]">Recipes and health information</h2>
          <p className="mt-3">
            Recipup provides recipe and meal planning guidance. It is not veterinary advice. Always speak with a vet
            before changing your dog&apos;s diet, especially if your dog has allergies, illness, medication, or a
            diagnosed health condition.
          </p>
        </div>

        <div>
          <h2 className="font-heading text-2xl text-[var(--color-ink)]">Your account</h2>
          <p className="mt-3">
            You are responsible for keeping your login details secure and for the accuracy of the dog profile,
            pantry, and health information you enter.
          </p>
        </div>

        <div>
          <h2 className="font-heading text-2xl text-[var(--color-ink)]">Acceptable use</h2>
          <p className="mt-3">
            Do not misuse Recipup, attempt to disrupt the service, reverse engineer private systems, or use generated
            content in a way that could harm animals or people.
          </p>
        </div>

        <div>
          <h2 className="font-heading text-2xl text-[var(--color-ink)]">Availability</h2>
          <p className="mt-3">
            We aim to keep Recipup reliable, but features may change, pause, or become unavailable while we improve
            the product or maintain third-party integrations.
          </p>
        </div>

        <div>
          <h2 className="font-heading text-2xl text-[var(--color-ink)]">Contact</h2>
          <p className="mt-3">
            Questions about these terms can be sent to{" "}
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
