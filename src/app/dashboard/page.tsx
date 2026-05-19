import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { compareToCompetitors } from "@/lib/cost-estimator";
import { TrialBanner } from "@/components/dashboard/TrialBanner";

function computeTrialDaysLeft(trialEndsAt: string): number {
  const msLeft = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

type Dog = {
  id: string;
  name: string;
  breed: string | null;
  weight_kg: number | null;
};

type Profile = {
  subscription_tier: string | null;
  trial_ends_at: string | null;
  market: string | null;
  full_name: string | null;
};

type TodayDay = {
  id: string;
  recipe_data: {
    recipe?: { name?: string; tagline?: string };
    day_name?: string;
  };
};

function toTitleCase(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

function dogInitials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase();
}

type SavedRecipeRow = {
  recipe_data: {
    cost_per_day_gbp?: number;
    cost_per_day_eur?: number;
    price_sync_date?: string | null;
  };
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  const [{ data: dogs }, { data: profile }, { data: pantryItems }, { data: activePlanData }, { data: recentRecipes }, { data: genCount }, { data: recentHealthLogs }] = await Promise.all([
    supabase
      .from("dogs")
      .select("id, name, breed, weight_kg")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("subscription_tier, trial_ends_at, market, full_name")
      .eq("id", user.id)
      .single(),
    supabase
      .from("pantry_items")
      .select("type, is_available, last_updated")
      .eq("user_id", user.id),
    supabase
      .from("meal_plans")
      .select("id, start_date, end_date, cooking_frequency, dogs(name)")
      .eq("user_id", user.id)
      .neq("status", "archived")
      .lte("start_date", today)
      .gte("end_date", today)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("saved_recipes")
      .select("recipe_data")
      .eq("user_id", user.id)
      .order("saved_at", { ascending: false })
      .limit(15),
    supabase
      .from("recipe_generations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("health_logs")
      .select("dog_id, week_start, response_message, recipe_adjustments, vet_flag")
      .eq("user_id", user.id)
      .order("week_start", { ascending: false })
      .limit(20),
  ]);

  type ActivePlan = { id: string; start_date: string; end_date: string; cooking_frequency: string; dogs: { name: string } | null };
  const activePlan = activePlanData as unknown as ActivePlan | null;

  // Query today's meal plan days if there's an active plan
  let todayDays: TodayDay[] = [];
  if (activePlan?.id) {
    const { data: td } = await supabase
      .from("meal_plan_days")
      .select("id, recipe_data")
      .eq("plan_id", activePlan.id)
      .eq("day_date", today);
    todayDays = (td ?? []) as unknown as TodayDay[];
  }

  const typedPantry = (pantryItems ?? []) as { type: string; is_available: boolean; last_updated: string }[];
  const availableIngredientCount = typedPantry.filter((i) => i.type === "ingredient" && i.is_available).length;
  const availableEquipmentCount = typedPantry.filter((i) => i.type === "equipment" && i.is_available).length;
  const pantryLastUpdated = typedPantry.reduce((latest, item) => {
    const t = item.last_updated ?? "";
    return t > latest ? t : latest;
  }, "");
  const pantryLastUpdatedDate = pantryLastUpdated
    ? new Date(pantryLastUpdated).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const typedProfile = profile as Profile | null;
  const typedDogs = (dogs ?? []) as Dog[];
  const market = (typedProfile?.market ?? "uk") as "uk" | "nl";
  const currency = market === "nl" ? "€" : "£";

  const inTrial = typedProfile?.trial_ends_at
    ? new Date(typedProfile.trial_ends_at as string) > new Date()
    : false;
  const hasCostAccess =
    ["pack", "pack_pro", "founding"].includes((typedProfile?.subscription_tier as string) ?? "") || inTrial;

  const trialDaysLeft =
    typedProfile?.trial_ends_at && typedProfile.subscription_tier === "free"
      ? computeTrialDaysLeft(typedProfile.trial_ends_at as string)
      : 0;

  const rawFullName: string | null =
    typedProfile?.full_name ??
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null;
  const firstName = (rawFullName?.trim() ? rawFullName.split(" ")[0] : null) ?? user.email?.split("@")[0] ?? "there";

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const costRecipes = ((recentRecipes ?? []) as unknown as SavedRecipeRow[]).filter(
    (r) => r.recipe_data?.cost_per_day_gbp != null || r.recipe_data?.cost_per_day_eur != null,
  );
  const avgDailyCost =
    costRecipes.length > 0
      ? costRecipes.reduce((sum, r) => sum + (market === "nl" ? (r.recipe_data.cost_per_day_eur ?? 0) : (r.recipe_data.cost_per_day_gbp ?? 0)), 0) / costRecipes.length
      : null;

  const latestSyncDate = costRecipes.reduce<string | null>((latest, r) => {
    const d = r.recipe_data.price_sync_date ?? null;
    if (!d) return latest;
    return !latest || d > latest ? d : latest;
  }, null);

  const syncDaysAgo = latestSyncDate
    ? daysSince(latestSyncDate)
    : null;

  const primaryDog = typedDogs[0] ?? null;
  const dogWeightKg = primaryDog?.weight_kg ?? 20;

  const competitors = avgDailyCost != null
    ? compareToCompetitors(avgDailyCost, dogWeightKg, market)
    : null;

  const totalGenerations = genCount as number | null;

  const hasHealthAccess = ["pack_pro", "founding"].includes((typedProfile?.subscription_tier as string) ?? "") || inTrial;

  type HealthLogRow = { dog_id: string; week_start: string; response_message: string | null; recipe_adjustments: Array<unknown>; vet_flag: boolean };
  const healthLogs = (recentHealthLogs ?? []) as HealthLogRow[];
  const latestLogByDog = new Map<string, HealthLogRow>();
  for (const log of healthLogs) {
    if (!latestLogByDog.has(log.dog_id)) latestLogByDog.set(log.dog_id, log);
  }
  const dogsNeedingCheckIn = typedDogs.filter((d) => {
    const log = latestLogByDog.get(d.id);
    if (!log) return true;
    return daysSince(log.week_start) > 7;
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
      {trialDaysLeft > 0 && <TrialBanner daysLeft={trialDaysLeft} />}

      {/* Greeting */}
      <div className="mb-8">
        <h1 className="font-heading text-4xl text-[var(--color-ink)]">{timeGreeting}, {firstName}.</h1>
        <p className="mt-2 text-[var(--color-ink-soft)]">
          {typedDogs.length > 0
            ? typedDogs.length === 1
              ? `Here's what's happening with ${toTitleCase(typedDogs[0].name)}.`
              : `Here's what's happening with your ${typedDogs.length} dogs.`
            : "Add your first dog to start building personalised recipe plans."}
        </p>
      </div>

      {/* Dog list — status-aware, one row per dog */}
      {typedDogs.length > 0 ? (
        <div className="space-y-3">
          {typedDogs.map((dog) => {
            const needsCheckIn = dogsNeedingCheckIn.some((d) => d.id === dog.id);
            const log = latestLogByDog.get(dog.id);
            const daysAgoLog = log ? daysSince(log.week_start) : null;
            const adjustmentCount = log?.recipe_adjustments?.length ?? 0;
            return (
              <div
                key={dog.id}
                className="flex flex-col gap-3 rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] px-5 py-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-coral)]/10 font-heading text-lg font-semibold text-[var(--color-coral)]">
                    {dogInitials(dog.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-heading text-lg text-[var(--color-ink)]">{toTitleCase(dog.name)}</p>
                    {dog.breed && (
                      <p className="text-sm capitalize text-[var(--color-ink-500)]">{dog.breed.replace(/_/g, " ")}</p>
                    )}
                    {hasHealthAccess && (
                      needsCheckIn ? (
                        <p className="mt-0.5 text-xs font-semibold text-[var(--color-coral)]">Check-in due this week</p>
                      ) : daysAgoLog !== null ? (
                        <p className="mt-0.5 text-xs text-[var(--color-ink-300)]">
                          Logged {daysAgoLog === 0 ? "today" : daysAgoLog === 1 ? "yesterday" : `${daysAgoLog} days ago`}
                          {adjustmentCount > 0 ? ` · ${adjustmentCount} adjustment${adjustmentCount !== 1 ? "s" : ""} made` : ""}
                        </p>
                      ) : null
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {hasHealthAccess && needsCheckIn ? (
                    <Link
                      href={`/dogs/${dog.id}/log`}
                      className="rounded-full bg-[var(--color-coral)] px-4 py-2 text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
                    >
                      Log health →
                    </Link>
                  ) : (
                    <Link
                      href={`/onboard?dog_id=${dog.id}`}
                      className="rounded-full bg-[var(--color-coral)] px-4 py-2 text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
                    >
                      Build plan →
                    </Link>
                  )}
                  <Link
                    href={`/dogs/${dog.id}`}
                    className="rounded-full border border-[var(--color-sand-deep)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-sand)]"
                  >
                    View →
                  </Link>
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-4 pt-1">
            <Link href="/dogs" className="text-sm font-semibold text-[var(--color-coral)] hover:underline">
              Manage all dogs →
            </Link>
            <Link href="/onboard" className="text-sm text-[var(--color-ink-500)] hover:text-[var(--color-ink)]">
              + Add another dog
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-10 text-center">
          <p className="font-heading text-2xl text-[var(--color-ink)]">No dogs added yet.</p>
          <p className="mt-2 text-[var(--color-ink-soft)]">
            Add your first dog and we&apos;ll build recipes around exactly who they are.
          </p>
          <Link
            href="/onboard"
            className="mt-6 inline-block rounded-full bg-[var(--color-coral)] px-6 py-3 text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
          >
            Add your first dog →
          </Link>
        </div>
      )}

      {/* Today's menu */}
      {todayDays.length > 0 && (
        <div className="mt-6 rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-sand)] px-5 py-4">
          <p className="eyebrow mb-2">On the menu today</p>
          <div className="flex flex-wrap gap-3">
            {todayDays.map((day) => {
              const recipeName = day.recipe_data?.recipe?.name ?? day.recipe_data?.day_name ?? "Today's recipe";
              return (
                <div key={day.id} className="flex items-center gap-2 text-sm text-[var(--color-ink)]">
                  <span className="text-[var(--color-coral)]">🍲</span>
                  <span className="font-medium">{recipeName}</span>
                </div>
              );
            })}
          </div>
          {activePlan && (
            <Link
              href={`/planner/${activePlan.id}`}
              className="mt-2 inline-block text-xs font-semibold text-[var(--color-coral)] hover:underline"
            >
              View full plan →
            </Link>
          )}
        </div>
      )}

      {/* Cost savings strip — visible near top when data is available */}
      {hasCostAccess && avgDailyCost != null && competitors && competitors[0]?.your_saving_daily > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--color-forest-muted)] px-5 py-4">
          <p className="text-sm font-semibold text-[var(--color-forest)]">
            {currency}{(avgDailyCost * 30.4).toFixed(2)}/month · saving ~{currency}{(competitors[0].your_saving_daily * 30.4).toFixed(0)}/month vs fresh delivery
          </p>
          {syncDaysAgo != null && (
            <p className="text-xs text-[var(--color-ink-300)]">
              Prices updated {syncDaysAgo === 0 ? "today" : `${syncDaysAgo}d ago`}
            </p>
          )}
        </div>
      )}

      {/* Active plan */}
      {activePlan && !todayDays.length && (
        <div className="mt-6 rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Active plan</p>
              <h2 className="mt-1 font-heading text-2xl text-[var(--color-ink)]">
                {toTitleCase(activePlan.dogs?.name) || "Your dog"}&apos;s meal plan
              </h2>
              <p className="mt-0.5 text-sm text-[var(--color-ink-soft)]">
                {new Date(activePlan.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                {" – "}
                {new Date(activePlan.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/planner/${activePlan.id}`}
                className="rounded-full bg-[var(--color-coral)] px-4 py-2 text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
              >
                View plan →
              </Link>
              <Link
                href={`/planner/${activePlan.id}/shopping`}
                className="rounded-full border border-[var(--color-sand-deep)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
              >
                Shopping list
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Kitchen */}
      <div className="mt-6 rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl text-[var(--color-ink)]">Your kitchen</h2>
            {pantryLastUpdatedDate ? (
              <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                {availableIngredientCount} ingredient{availableIngredientCount !== 1 ? "s" : ""} · {availableEquipmentCount} piece{availableEquipmentCount !== 1 ? "s" : ""} of equipment · Updated {pantryLastUpdatedDate}
              </p>
            ) : (
              <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                Tell us what you have and we&apos;ll build recipes around it.
              </p>
            )}
          </div>
          <Link
            href="/pantry"
            className="shrink-0 rounded-full border border-[var(--color-sand-deep)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-sand)]"
          >
            Update →
          </Link>
        </div>
      </div>

      {/* Cost detail */}
      {hasCostAccess && (
        <div className="mt-6 rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-6">
          <h2 className="font-heading text-xl text-[var(--color-ink)]">
            {toTitleCase(primaryDog?.name) || "Your dog"}&apos;s food costs
          </h2>

          {avgDailyCost != null ? (
            <div className="mt-4 space-y-4">
              <div className="flex gap-8">
                <div>
                  <p className="text-sm text-[var(--color-ink-soft)]">This month (estimated)</p>
                  <p className="mt-0.5 font-heading text-2xl text-[var(--color-ink)]">
                    {currency}{(avgDailyCost * 30.4).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[var(--color-ink-soft)]">Per day</p>
                  <p className="mt-0.5 font-heading text-2xl text-[var(--color-ink)]">
                    {currency}{avgDailyCost.toFixed(2)}
                  </p>
                </div>
              </div>

              {competitors && competitors.length > 0 && (
                <div className="border-t border-[var(--color-sand-deep)] pt-4 space-y-2">
                  {competitors.slice(0, 1).map((comp) => (
                    <div key={comp.brand} className="flex items-center justify-between text-sm">
                      <span className="text-[var(--color-ink-soft)]">vs approx. fresh food delivery</span>
                      <span className="text-[var(--color-ink-soft)]">
                        ~{currency}{comp.their_daily_cost.toFixed(2)}/day for a {comp.dog_weight_kg}kg dog
                      </span>
                    </div>
                  ))}
                  {competitors[0]?.your_saving_daily > 0 && (
                    <span className="inline-flex items-center rounded-full bg-[var(--color-forest-muted)] px-3 py-1 text-xs font-semibold text-[var(--color-forest)]">
                      Saving ~{currency}{(competitors[0].your_saving_daily * 30.4).toFixed(0)}/month vs fresh delivery
                    </span>
                  )}
                </div>
              )}

              <p className="text-xs text-[var(--color-ink-300)]">
                Based on {costRecipes.length} recipe{costRecipes.length !== 1 ? "s" : ""}
                {syncDaysAgo != null
                  ? ` · Prices updated ${syncDaysAgo === 0 ? "today" : `${syncDaysAgo} day${syncDaysAgo !== 1 ? "s" : ""} ago`}`
                  : ""}
              </p>
              <p className="text-xs italic text-[var(--color-ink-300)]">
                Competitor prices are publicly listed estimates and may vary.
              </p>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-[var(--color-ink-soft)]">
                Build your first recipe plan to start tracking costs and compare to fresh food delivery.
              </p>
              <Link
                href="/onboard"
                className="mt-4 inline-block rounded-full bg-[var(--color-coral)] px-5 py-2.5 text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
              >
                Build a recipe plan →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
