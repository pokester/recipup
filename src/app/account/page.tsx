import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AccountClient } from "@/components/account/AccountClient";

function computeTrialDaysLeft(trialEndsAt: string): number {
  const msLeft = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
}

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

const TIER_COLORS: Record<string, string> = {
  free: "bg-[var(--color-sand-deep)] text-[var(--color-ink-700)]",
  pack: "bg-[var(--color-coral)] text-[var(--color-warm-white)]",
  pack_pro: "bg-[var(--color-forest)] text-[var(--color-warm-white)]",
  founding: "bg-[var(--color-ink-700)] text-[var(--color-warm-white)]",
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
  const tierColor = TIER_COLORS[tier] ?? TIER_COLORS.free;

  const inTrial =
    typedProfile?.trial_ends_at && typedProfile.subscription_tier === "free"
      ? new Date(typedProfile.trial_ends_at) > new Date()
      : false;

  const trialDaysLeft = inTrial
    ? Math.max(
        0,
        computeTrialDaysLeft(typedProfile!.trial_ends_at!),
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
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-heading text-3xl text-[var(--color-ink)]">Your account</h1>

      <div className="mt-10 space-y-6">
        {/* Section 1 — Details */}
        <div className="rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-8">
          <h2 className="mb-6 font-heading text-xl text-[var(--color-ink)]">Your details</h2>
          <div>
            <div className="flex items-center justify-between border-b border-[var(--color-sand-deep)] py-4">
              <span className="text-sm text-[var(--color-ink-500)]">Name</span>
              <span className="text-sm font-medium text-[var(--color-ink)]">{displayName ?? "Not set"}</span>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--color-sand-deep)] py-4">
              <span className="text-sm text-[var(--color-ink-500)]">Email address</span>
              <span className="text-sm font-medium text-[var(--color-ink)]">{user.email}</span>
            </div>
          </div>
          <AccountClient userEmail={user.email ?? ""} />
        </div>

        {/* Section 2 — Subscription */}
        <div className="rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-8">
          <h2 className="mb-6 font-heading text-xl text-[var(--color-ink)]">Your subscription</h2>

          <span className={`inline-block rounded-full px-4 py-2 text-sm font-semibold ${inTrial ? "bg-[var(--color-coral)] text-[var(--color-warm-white)]" : tierColor}`}>
            {inTrial ? "Pack Pro Trial" : tierLabel}
          </span>

          {inTrial && (
            <div className="mt-4">
              <p className="text-sm text-[var(--color-ink-500)]">
                {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} remaining in your free trial.
              </p>
              <Link
                href="/pricing"
                className="mt-4 inline-block rounded-full bg-[var(--color-coral)] px-5 py-2.5 text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
              >
                Upgrade before your trial ends →
              </Link>
            </div>
          )}

          {!inTrial && tier !== "free" && (
            <div className="mt-4">
              {renewsAt && (
                <p className="text-sm text-[var(--color-ink-500)]">Renews {renewsAt}</p>
              )}
              <button
                type="button"
                disabled
                className="mt-4 rounded-full border border-[var(--color-sand-deep)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink-300)] opacity-60"
                title="Stripe billing portal — coming soon"
              >
                Manage subscription →
              </button>
              <p className="mt-1 text-xs text-[var(--color-ink-300)]">Billing portal coming soon.</p>
            </div>
          )}

          {!inTrial && tier === "free" && (
            <div className="mt-4">
              <p className="text-sm text-[var(--color-ink-500)]">
                Upgrade to unlock the meal planner, shopping list, cost tracker, and health history.
              </p>
              <Link
                href="/pricing"
                className="mt-4 inline-block rounded-full bg-[var(--color-coral)] px-5 py-2.5 text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
              >
                See plans →
              </Link>
            </div>
          )}
        </div>

        {/* Section 3 — Data */}
        <div className="rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-8">
          <h2 className="mb-6 font-heading text-xl text-[var(--color-ink)]">Your data</h2>
          <div className="space-y-6">
            <div>
              <button
                type="button"
                disabled
                className="rounded-full border border-[var(--color-sand-deep)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink-300)] opacity-60"
              >
                Download my data
              </button>
              <p className="mt-1 text-xs text-[var(--color-ink-300)]">Coming soon.</p>
            </div>

            <div className="border-t border-[var(--color-sand-deep)] pt-6">
              <p className="text-sm font-semibold text-[var(--color-ink)]">Delete account</p>
              <p className="mt-1 text-xs text-[var(--color-ink-500)]">
                This will permanently delete your account, all dog profiles, recipes, and health history. This cannot be undone.
              </p>
              <Link
                href="/account/delete"
                className="mt-3 inline-block rounded-full border border-red-200 px-5 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                Delete account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
