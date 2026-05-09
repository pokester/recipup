import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AccountClient } from "@/components/account/AccountClient";

type Profile = {
  full_name: string | null;
  subscription_tier: string | null;
  trial_ends_at: string | null;
  subscription_expires_at: string | null;
};

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  pack: "Pack",
  pack_pro: "Pack Pro",
  founding: "Founding Member",
};

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, subscription_tier, trial_ends_at, subscription_expires_at")
    .eq("id", user.id)
    .single();

  const typedProfile = profile as Profile | null;

  const tier = typedProfile?.subscription_tier ?? "free";
  const tierLabel = TIER_LABELS[tier] ?? "Free";

  const inTrial =
    typedProfile?.trial_ends_at && typedProfile.subscription_tier === "free"
      ? new Date(typedProfile.trial_ends_at) > new Date()
      : false;

  const trialDaysLeft = inTrial
    ? Math.max(
        0,
        Math.ceil((new Date(typedProfile!.trial_ends_at!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      )
    : 0;

  const displayName =
    typedProfile?.full_name ||
    (user.user_metadata?.full_name as string | undefined) ||
    null;

  const renewsAt = typedProfile?.subscription_expires_at
    ? new Date(typedProfile.subscription_expires_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 md:px-10">
      <h1 className="font-heading text-4xl text-[var(--color-ink)]">Your account</h1>

      <div className="mt-8 space-y-6">
        {/* Section 1 — Details */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] p-6">
          <h2 className="font-heading text-xl text-[var(--color-ink)]">Your details</h2>
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">Name</p>
              <p className="mt-1 text-[var(--color-ink)]">{displayName ?? "Not set"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">Email address</p>
              <p className="mt-1 text-[var(--color-ink)]">{user.email}</p>
            </div>
          </div>
          <AccountClient userEmail={user.email ?? ""} />
        </div>

        {/* Section 2 — Subscription */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] p-6">
          <h2 className="font-heading text-xl text-[var(--color-ink)]">Your subscription</h2>

          <div className="mt-4">
            <span className="inline-block rounded-full bg-[var(--color-accent)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-accent)]">
              {inTrial ? "Pack Pro Trial" : tierLabel}
            </span>

            {inTrial && (
              <div className="mt-3">
                <p className="text-sm text-[var(--color-ink-soft)]">
                  {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} remaining in your trial.
                </p>
                <Link
                  href="/pricing"
                  className="mt-3 inline-block rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-cream)] transition-transform hover:-translate-y-0.5"
                >
                  Upgrade before your trial ends →
                </Link>
              </div>
            )}

            {!inTrial && tier !== "free" && (
              <div className="mt-3">
                {renewsAt && (
                  <p className="text-sm text-[var(--color-ink-soft)]">Renews {renewsAt}</p>
                )}
                <button
                  type="button"
                  disabled
                  className="mt-3 rounded-full border border-[var(--color-border-strong)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink-soft)] opacity-60"
                  title="Stripe billing portal — coming soon"
                >
                  Manage subscription →
                </button>
                <p className="mt-1 text-xs text-[var(--color-ink-soft)]">Billing portal coming soon.</p>
              </div>
            )}

            {!inTrial && tier === "free" && (
              <div className="mt-3">
                <p className="text-sm text-[var(--color-ink-soft)]">
                  Upgrade to unlock the meal planner, shopping list, cost tracker, and health history.
                </p>
                <Link
                  href="/pricing"
                  className="mt-3 inline-block rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-cream)] transition-transform hover:-translate-y-0.5"
                >
                  See plans →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Section 3 — Data */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] p-6">
          <h2 className="font-heading text-xl text-[var(--color-ink)]">Your data</h2>
          <div className="mt-4 space-y-4">
            <div>
              <button
                type="button"
                disabled
                className="rounded-full border border-[var(--color-border-strong)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink-soft)] opacity-60"
              >
                Download my data
              </button>
              <p className="mt-1 text-xs text-[var(--color-ink-soft)]">Coming soon.</p>
            </div>

            <div className="border-t border-[var(--color-border)] pt-4">
              <AccountDeleteSection dogName={displayName ?? user.email?.split("@")[0] ?? "your account"} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountDeleteSection({ dogName }: { dogName: string }) {
  void dogName;
  return (
    <div>
      <p className="text-sm font-semibold text-[var(--color-ink)]">Delete account</p>
      <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
        This will permanently delete your account, all dog profiles, recipes, and health history. This cannot be undone.
      </p>
      <Link
        href="/account/delete"
        className="mt-3 inline-block rounded-full border border-red-200 px-5 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
      >
        Delete account
      </Link>
    </div>
  );
}
