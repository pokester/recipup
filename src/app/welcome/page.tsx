import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }> | { type?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await Promise.resolve(searchParams);
  const isFounding = params.type === "founding";

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-16">
      <div className="mx-auto w-full max-w-lg text-center">
        {isFounding ? (
          <>
            <div className="mb-6 inline-block rounded-full bg-[var(--color-forest-muted)] px-4 py-1.5 text-xs font-semibold text-[var(--color-forest)]">
              Founding Member
            </div>
            <h1 className="font-heading text-4xl leading-tight text-[var(--color-ink)] md:text-5xl">
              You&apos;re in.
            </h1>
            <p className="mx-auto mt-4 max-w-md text-lg text-[var(--color-ink-soft)]">
              Your founding price is locked in: £1.50/month, forever. You&apos;ll have direct input on what we build next and early access to every new feature.
            </p>
            <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-sand)] p-6 text-left">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-ink-300)]">What you&apos;ve secured</p>
              <ul className="mt-4 space-y-3">
                {[
                  "14 days of full Pack Pro access, free",
                  "£1.50/month after — locked in for life",
                  "Everything in Pack Pro, always",
                  "Early access to every new feature",
                  "Direct input on the product roadmap",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-[var(--color-ink)]">
                    <span className="mt-0.5 shrink-0 text-[var(--color-forest)]">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <>
            <h1 className="font-heading text-4xl leading-tight text-[var(--color-ink)] md:text-5xl">
              Welcome to Recipup.
            </h1>
            <p className="mx-auto mt-4 max-w-md text-lg text-[var(--color-ink-soft)]">
              Your 14-day trial has started. Full Pack Pro access from day one — no card required.
            </p>
          </>
        )}

        <div className="mt-10">
          <Link
            href="/onboard"
            className="inline-block rounded-full bg-[var(--color-coral)] px-8 py-4 text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
          >
            Build your first recipe plan →
          </Link>
          <p className="mt-4 text-sm text-[var(--color-ink-soft)]">
            Takes about two minutes. We&apos;ll ask about your dog first.
          </p>
        </div>
      </div>
    </div>
  );
}
