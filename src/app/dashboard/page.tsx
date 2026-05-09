import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { compareToCompetitors } from "@/lib/cost-estimator";

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
};

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

  const [{ data: dogs }, { data: profile }, { data: pantryItems }, { data: activePlanData }, { data: recentRecipes }, { data: genCount }, { data: recentHealthLogs }] = await Promise.all([
    supabase
      .from("dogs")
      .select("id, name, breed, weight_kg")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("subscription_tier, trial_ends_at, market")
      .eq("user_id", user.id)
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
      .lte("start_date", new Date().toISOString().split("T")[0])
      .gte("end_date", new Date().toISOString().split("T")[0])
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
      ? Math.max(0, Math.ceil((new Date(typedProfile.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;

  const firstName =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
    user.email?.split("@")[0] ||
    "there";

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // Compute average daily cost from saved recipes that have cost data
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
    ? Math.floor((Date.now() - new Date(latestSyncDate).getTime()) / (1000 * 60 * 60 * 24))
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
  const today = new Date().toISOString().split("T")[0];
  const dogsNeedingCheckIn = typedDogs.filter((d) => {
    const log = latestLogByDog.get(d.id);
    if (!log) return true;
    const daysAgo = Math.floor((Date.now() - new Date(log.week_start).getTime()) / (1000 * 60 * 60 * 24));
    return daysAgo > 7;
  });
  void today;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
      {trialDaysLeft > 0 && (
        <div className="mb-8 flex items-center justify-between rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4">
          <p className="text-sm font-semibold text-amber-900">
            {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} left in your free trial — upgrade to keep full access
          </p>
          <Link href="/account" className="rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-xs font-semibold text-[var(--color-cream)]">Upgrade</Link>
        </div>
      )}

      <div className="mb-8">
        <h1 className="font-heading text-4xl text-[var(--color-ink)]">{timeGreeting}, {firstName} 🐾</h1>
        <p className="mt-2 text-[var(--color-ink-soft)]">
          {typedDogs.length > 0
            ? `${typedDogs.length} dog${typedDogs.length !== 1 ? "s" : ""} in your pack — build a recipe plan or browse your library.`
            : "Add your first dog to start building personalised recipe plans."}
        </p>
      </div>

      {typedDogs.length > 0 ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {typedDogs.map((dog) => (
              <div key={dog.id} className="flex flex-col gap-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] p-6">
                <div>
                  <p className="font-heading text-2xl text-[var(--color-ink)]">{dog.name}</p>
                  {dog.breed && <p className="mt-1 text-sm capitalize text-[var(--color-ink-soft)]">{dog.breed.replace(/_/g, " ")}</p>}
                </div>
                <div className="flex flex-col gap-2">
                  <Link href={`/onboard?dog_id=${dog.id}`} className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-center text-sm font-semibold text-[var(--color-cream)] transition-transform hover:-translate-y-0.5">Build {dog.name}&apos;s recipe plan →</Link>
                  <Link href="/library" className="rounded-full border border-[var(--color-border-strong)] px-4 py-2 text-center text-sm font-semibold text-[var(--color-ink)]">Recipe library →</Link>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Link href="/dogs" className="text-sm font-semibold text-[var(--color-accent)] hover:underline">Manage all dogs →</Link>
          </div>
        </>
      ) : (
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] p-10 text-center">
          <p className="font-heading text-2xl text-[var(--color-ink)]">No dogs added yet.</p>
          <p className="mt-2 text-[var(--color-ink-soft)]">Add your first dog's profile and we'll build their recipe plan around what they actually need.</p>
          <Link href="/onboard" className="mt-6 inline-block rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[var(--color-cream)] transition-transform hover:-translate-y-0.5">Add your first dog →</Link>
        </div>
      )}

      {activePlan && (
        <div className="mt-8 rounded-3xl border-2 border-[var(--color-accent)] bg-[var(--color-cream-soft)] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">Active plan</p>
              <h2 className="mt-1 font-heading text-2xl text-[var(--color-ink)]">{activePlan.dogs?.name ?? "Your dog"}&apos;s meal plan</h2>
              <p className="mt-0.5 text-sm text-[var(--color-ink-soft)]">
                {new Date(activePlan.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                {" – "}
                {new Date(activePlan.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/planner/${activePlan.id}`} className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-cream)] transition-transform hover:-translate-y-0.5">View plan →</Link>
              <Link href={`/planner/${activePlan.id}/shopping`} className="rounded-full border border-[var(--color-border-strong)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)]">Shopping list</Link>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 rounded-3xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl text-[var(--color-ink)]">Your kitchen 🥘</h2>
            {pantryLastUpdatedDate ? (
              <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                {availableIngredientCount} ingredient{availableIngredientCount !== 1 ? "s" : ""} &middot;{" "}
                {availableEquipmentCount} piece{availableEquipmentCount !== 1 ? "s" : ""} of equipment
              </p>
            ) : (
              <p className="mt-1 text-sm text-[var(--color-ink-soft)]">Tell us what you have and we'll build recipes around it.</p>
            )}
            {pantryLastUpdatedDate && <p className="mt-1 text-xs text-[var(--color-ink-soft)]">Last updated {pantryLastUpdatedDate}</p>}
          </div>
          <Link href="/pantry" className="shrink-0 rounded-full border border-[var(--color-border-strong)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-cream)]">Update kitchen →</Link>
        </div>
      </div>

      {/* Cost widget — Pack+ or trial only */}
      {hasCostAccess && (
        <div className="mt-8 rounded-3xl border-l-4 border-l-[var(--color-accent)] border-[var(--color-border)] bg-[var(--color-cream-soft)] p-6">
          <h2 className="font-heading text-2xl text-[var(--color-ink)]">
            {primaryDog?.name ?? "Your dog"}&apos;s food costs
          </h2>

          {avgDailyCost != null ? (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[var(--color-ink-soft)]">This month (estimated)</p>
                  <p className="mt-0.5 font-heading text-2xl text-[var(--color-ink)]">
                    {currency}{(avgDailyCost * 30.4).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--color-ink-soft)]">Per day</p>
                  <p className="mt-0.5 font-heading text-2xl text-[var(--color-ink)]">
                    {currency}{avgDailyCost.toFixed(2)}
                  </p>
                </div>
              </div>

              {competitors && competitors.length > 0 && (
                <div className="mt-4 border-t border-[var(--color-border)] pt-4 space-y-2">
                  {competitors.slice(0, 1).map((comp) => (
                    <div key={comp.brand} className="flex items-center justify-between text-sm">
                      <span className="text-[var(--color-ink-soft)]">vs approx. {comp.brand}</span>
                      <span className="text-[var(--color-ink-soft)]">~{currency}{comp.their_daily_cost.toFixed(2)}/day for a {comp.dog_weight_kg}kg dog</span>
                    </div>
                  ))}
                  {competitors[0] && competitors[0].your_saving_daily > 0 && (
                    <p className="font-semibold text-green-700 text-sm">
                      💚 Saving ~{currency}{(competitors[0].your_saving_daily * 30.4).toFixed(0)}/month vs fresh delivery
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs text-[var(--color-ink-soft)]">
                Based on {costRecipes.length} recipe{costRecipes.length !== 1 ? "s" : ""} generated
                {totalGenerations != null && totalGenerations > costRecipes.length ? ` · ${totalGenerations} total generations` : ""}
                {syncDaysAgo != null ? ` · Prices updated ${syncDaysAgo === 0 ? "today" : `${syncDaysAgo} day${syncDaysAgo !== 1 ? "s" : ""} ago`}` : ""}
              </p>
              <p className="text-xs italic text-[var(--color-ink-soft)]">Competitor prices are publicly listed estimates and may vary.</p>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-[var(--color-ink-soft)]">
                Build your first recipe plan to start tracking costs and see how much you save versus fresh food delivery services.
              </p>
              <Link href="/onboard" className="mt-4 inline-block rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-cream)] transition-transform hover:-translate-y-0.5">
                Build a recipe plan →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Health widget */}
      <div className="mt-8 rounded-3xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] p-6">
        <h2 className="font-heading text-2xl text-[var(--color-ink)]">Weekly health check-in</h2>

        {!hasHealthAccess ? (
          <div className="mt-4">
            <p className="text-[var(--color-ink-soft)]">Health tracking is a Pack Pro feature.</p>
            <Link
              href="/pricing"
              className="mt-3 inline-block text-sm font-semibold text-[var(--color-accent)] hover:underline"
            >
              Upgrade to track {primaryDog?.name ?? "your dog"}&apos;s progress →
            </Link>
          </div>
        ) : typedDogs.length === 0 ? (
          <p className="mt-4 text-[var(--color-ink-soft)]">Add a dog to start tracking their health.</p>
        ) : dogsNeedingCheckIn.length === typedDogs.length ? (
          <div className="mt-4">
            <p className="font-semibold text-[var(--color-ink)]">
              {typedDogs.length === 1
                ? `Time for ${typedDogs[0].name}'s check-in`
                : `${dogsNeedingCheckIn.length} dogs need a check-in`}
            </p>
            <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
              It takes 60 seconds and helps us keep the recipes spot on.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {dogsNeedingCheckIn.slice(0, 3).map((dog) => (
                <Link
                  key={dog.id}
                  href={`/dogs/${dog.id}/log`}
                  className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-cream)] transition-transform hover:-translate-y-0.5"
                >
                  Log {dog.name} →
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {typedDogs.map((dog) => {
              const log = latestLogByDog.get(dog.id);
              const needsCheckIn = dogsNeedingCheckIn.some((d) => d.id === dog.id);
              const daysAgo = log
                ? Math.floor((Date.now() - new Date(log.week_start).getTime()) / (1000 * 60 * 60 * 24))
                : null;
              const adjustmentCount = log?.recipe_adjustments?.length ?? 0;
              return (
                <div key={dog.id} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[var(--color-ink)]">{dog.name}</p>
                    {needsCheckIn ? (
                      <p className="text-sm text-[var(--color-ink-soft)]">Time for this week&apos;s check-in</p>
                    ) : (
                      <p className="text-sm text-[var(--color-ink-soft)]">
                        Logged {daysAgo === 0 ? "today" : `${daysAgo} days ago`} ·{" "}
                        {adjustmentCount > 0 ? `${adjustmentCount} adjustment${adjustmentCount !== 1 ? "s" : ""} made` : "All looking good"}
                      </p>
                    )}
                  </div>
                  {needsCheckIn ? (
                    <Link
                      href={`/dogs/${dog.id}/log`}
                      className="shrink-0 rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-cream)] transition-transform hover:-translate-y-0.5"
                    >
                      Log now →
                    </Link>
                  ) : (
                    <Link
                      href={`/dogs/${dog.id}#health`}
                      className="shrink-0 rounded-full border border-[var(--color-border-strong)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
                    >
                      View health history →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
