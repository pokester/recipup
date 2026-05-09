import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type MealPlanRow = {
  id: string;
  plan_type: string;
  cooking_frequency: string;
  start_date: string;
  end_date: string;
  status: string;
  estimated_weekly_cost_gbp: number | null;
  dogs: { name: string; breed: string | null } | null;
};

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${s.toLocaleDateString("en-GB", opts)} – ${e.toLocaleDateString("en-GB", { ...opts, year: "numeric" })}`;
}

function cookingLabel(freq: string): string {
  if (freq === "daily") return "🍳 Fresh daily";
  if (freq === "twice_weekly") return "🥘 Batch 3–4 days";
  return "🫙 Weekly batch";
}

export default async function PlannerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: plans }] = await Promise.all([
    supabase
      .from("profiles")
      .select("subscription_tier, trial_ends_at")
      .eq("id", user.id)
      .single(),
    supabase
      .from("meal_plans")
      .select("id, plan_type, cooking_frequency, start_date, end_date, status, estimated_weekly_cost_gbp, dogs(name, breed)")
      .eq("user_id", user.id)
      .neq("status", "archived")
      .order("created_at", { ascending: false }),
  ]);

  const inTrial = profile?.trial_ends_at
    ? new Date(profile.trial_ends_at as string) > new Date()
    : false;
  const hasPlannerAccess =
    ["pack", "pack_pro", "founding"].includes((profile?.subscription_tier as string) ?? "") ||
    inTrial;

  if (!hasPlannerAccess) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <p className="text-5xl">🐾</p>
        <h1 className="mt-6 font-heading text-4xl text-[var(--color-ink)]">
          Meal planning is a Pack feature.
        </h1>
        <p className="mt-4 text-[var(--color-ink-soft)]">
          Upgrade for less than £1.09 a month — less than a bag of treats.
        </p>
        <Link
          href="/account"
          className="mt-8 inline-block rounded-full bg-[var(--color-accent)] px-8 py-3 text-sm font-semibold text-[var(--color-cream)] transition-transform hover:-translate-y-0.5"
        >
          See plans →
        </Link>
      </div>
    );
  }

  const typedPlans = (plans ?? []) as unknown as MealPlanRow[];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activePlan =
    typedPlans.find((p) => new Date(p.start_date) <= today && new Date(p.end_date) >= today) ??
    typedPlans[0];

  const previousPlans = typedPlans.filter((p) => p.id !== activePlan?.id);

  function dayProgress(plan: MealPlanRow): string {
    const start = new Date(plan.start_date);
    const dayNum = Math.min(7, Math.max(1, Math.ceil((today.getTime() - start.getTime()) / 86400000) + 1));
    return `Day ${dayNum} of 7`;
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-4xl text-[var(--color-ink)]">Meal planner</h1>
          <p className="mt-2 text-[var(--color-ink-soft)]">
            Plan your dog&apos;s week, sort the shopping, and batch cook like a pro.
          </p>
        </div>
        <Link
          href="/planner/new"
          className="rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-cream)] transition-transform hover:-translate-y-0.5"
        >
          New plan +
        </Link>
      </div>

      {typedPlans.length === 0 ? (
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] p-12 text-center">
          <p className="text-6xl">🥣</p>
          <p className="mt-6 font-heading text-3xl text-[var(--color-ink)]">No meal plans yet.</p>
          <p className="mt-3 text-[var(--color-ink-soft)]">
            Create your first plan and we&apos;ll build the recipes, work out the portions,
            and generate your shopping list in one go.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/planner/new?type=weekly"
              className="rounded-full bg-[var(--color-accent)] px-7 py-3 text-sm font-semibold text-[var(--color-cream)] transition-transform hover:-translate-y-0.5"
            >
              Plan a week →
            </Link>
            <Link
              href="/planner/new?type=monthly"
              className="rounded-full border border-[var(--color-border-strong)] px-7 py-3 text-sm font-semibold text-[var(--color-ink)]"
            >
              Plan a month →
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active plan card */}
          {activePlan && (
            <div className="rounded-3xl border-2 border-[var(--color-accent)] bg-[var(--color-cream-soft)] p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-2xl text-[var(--color-ink)]">
                      {activePlan.dogs?.name ?? "Your dog"}
                    </span>
                    {activePlan.dogs?.breed && (
                      <span className="text-sm capitalize text-[var(--color-ink-soft)]">
                        · {activePlan.dogs.breed.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                    {formatDateRange(activePlan.start_date, activePlan.end_date)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-[var(--color-border-strong)] px-3 py-1 text-xs text-[var(--color-ink-soft)]">
                      {cookingLabel(activePlan.cooking_frequency)}
                    </span>
                    <span className="text-sm font-semibold text-[var(--color-accent)]">
                      {dayProgress(activePlan)}
                    </span>
                    {activePlan.estimated_weekly_cost_gbp && (
                      <span className="text-sm text-[var(--color-ink-soft)]">
                        Est. £{activePlan.estimated_weekly_cost_gbp.toFixed(2)}/week
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <Link
                    href={`/planner/${activePlan.id}`}
                    className="rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-[var(--color-cream)] transition-transform hover:-translate-y-0.5"
                  >
                    View plan →
                  </Link>
                  <Link
                    href={`/planner/${activePlan.id}/shopping`}
                    className="rounded-full border border-[var(--color-border-strong)] px-5 py-2 text-center text-sm font-semibold text-[var(--color-ink)]"
                  >
                    Shopping list →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Previous plans */}
          {previousPlans.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
                Previous plans
              </h2>
              <div className="space-y-2">
                {previousPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] px-5 py-4"
                  >
                    <div>
                      <p className="font-semibold text-[var(--color-ink)]">
                        {plan.dogs?.name ?? "Dog"} &middot;{" "}
                        {formatDateRange(plan.start_date, plan.end_date)}
                      </p>
                      <p className="mt-0.5 text-xs capitalize text-[var(--color-ink-soft)]">
                        {plan.plan_type} · {cookingLabel(plan.cooking_frequency)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/planner/${plan.id}`}
                        className="rounded-full border border-[var(--color-border-strong)] px-4 py-1.5 text-xs font-semibold text-[var(--color-ink)]"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
