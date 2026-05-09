import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { calculateRecipeCost, compareToCompetitors } from "@/lib/cost-estimator";

type Ingredient = {
  name: string;
  grams: number;
  cups?: string;
  notes?: string;
  needs_purchasing?: boolean;
  running_low?: boolean;
};

type RecipeData = {
  day_name: string;
  recipe: {
    name: string;
    ingredients: Ingredient[];
    serves_days?: number;
  };
};

type MealPlanDay = {
  id: string;
  day_date: string;
  day_number: number;
  recipe_data: RecipeData;
};

type AggregatedIngredient = {
  name: string;
  totalGrams: number;
  cups: string;
  notes: string;
  runningLow: boolean;
  days: string[];
};

function aggregateIngredients(days: MealPlanDay[]): AggregatedIngredient[] {
  const map = new Map<string, AggregatedIngredient>();
  for (const day of days) {
    const recipe = day.recipe_data?.recipe;
    if (!recipe?.ingredients) continue;
    for (const ing of recipe.ingredients) {
      if (!ing.needs_purchasing) continue;
      const key = ing.name.toLowerCase().trim();
      const existing = map.get(key);
      if (existing) {
        existing.totalGrams += ing.grams;
        if (!existing.days.includes(day.recipe_data.day_name)) existing.days.push(day.recipe_data.day_name);
        if (ing.running_low) existing.runningLow = true;
      } else {
        map.set(key, {
          name: ing.name,
          totalGrams: ing.grams,
          cups: ing.cups ?? "",
          notes: ing.notes ?? "",
          runningLow: ing.running_low ?? false,
          days: [day.recipe_data.day_name],
        });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export default async function ShoppingPage({ params }: { params: Promise<{ plan_id: string }> }) {
  const { plan_id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, trial_ends_at, market")
    .eq("user_id", user.id)
    .single();

  const inTrial = profile?.trial_ends_at
    ? new Date(profile.trial_ends_at as string) > new Date()
    : false;
  const hasPlannerAccess =
    ["pack", "pack_pro", "founding"].includes((profile?.subscription_tier as string) ?? "") || inTrial;

  if (!hasPlannerAccess) redirect("/planner");

  const market = ((profile as Record<string, unknown> | null)?.market as "uk" | "nl") ?? "uk";
  const currency = market === "nl" ? "€" : "£";

  const [{ data: plan }, { data: daysData }, { data: dogData }] = await Promise.all([
    supabase
      .from("meal_plans")
      .select("id, start_date, end_date, dog_id, dogs(name, weight_kg)")
      .eq("id", plan_id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("meal_plan_days")
      .select("id, day_date, day_number, recipe_data")
      .eq("plan_id", plan_id)
      .order("day_date", { ascending: true }),
    supabase
      .from("dogs")
      .select("weight_kg, current_food_spend_monthly")
      .eq("id", (await supabase.from("meal_plans").select("dog_id").eq("id", plan_id).single()).data?.dog_id ?? "")
      .maybeSingle(),
  ]);

  if (!plan) redirect("/planner");

  const days = (daysData ?? []) as unknown as MealPlanDay[];
  const items = aggregateIngredients(days);

  type PlanRow = { id: string; start_date: string; end_date: string; dog_id: string; dogs: { name: string; weight_kg: number | null } | null };
  const typedPlan = plan as unknown as PlanRow;
  const dogName = typedPlan.dogs?.name ?? "Your dog";
  const dogWeight = typedPlan.dogs?.weight_kg ?? (dogData as { weight_kg: number | null } | null)?.weight_kg ?? 20;

  const startDate = new Date(typedPlan.start_date);
  const endDate = new Date(typedPlan.end_date);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const dateRange = `${startDate.toLocaleDateString("en-GB", opts)} – ${endDate.toLocaleDateString("en-GB", { ...opts, year: "numeric" })}`;

  // Calculate total week cost from all day recipes
  let weekCostTotal = 0;
  let hasCostData = false;
  let priceSyncDate: string | null = null;

  if (days.length > 0) {
    try {
      const costs = await Promise.all(
        days.map((day) =>
          calculateRecipeCost(
            {
              ingredients: day.recipe_data.recipe.ingredients.map((i) => ({ name: i.name, grams: i.grams })),
              serves_days: day.recipe_data.recipe.serves_days ?? 1,
            },
            market,
            1, // per day
          ),
        ),
      );
      weekCostTotal = costs.reduce((sum, c) => sum + c.cost_per_day, 0);
      hasCostData = weekCostTotal > 0;
      const syncDates = costs.map((c) => c.price_sync_date).filter(Boolean) as string[];
      if (syncDates.length > 0) priceSyncDate = syncDates.sort().at(-1) ?? null;
    } catch {
      // Non-critical — cost section won't show
    }
  }

  const syncDateLabel = priceSyncDate
    ? new Date(priceSyncDate).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : null;

  const competitors = hasCostData ? compareToCompetitors(weekCostTotal / 7, dogWeight, market) : null;
  const butternut = competitors?.find((c) => c.brand === "Butternut Box");

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 md:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl text-[var(--color-ink)]">{dogName}&apos;s shopping list</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
            {dogName} · {dateRange}
          </p>
          {hasCostData && (
            <p className="mt-1 text-sm font-semibold text-[var(--color-accent)]">
              Estimated week: {currency}{weekCostTotal.toFixed(2)}
            </p>
          )}
        </div>
        <Link href={`/planner/${plan_id}`} className="rounded-full border border-[var(--color-border-strong)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)]">
          ← View plan
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] p-10 text-center">
          <p className="text-4xl">🛒</p>
          <p className="mt-4 font-heading text-2xl text-[var(--color-ink)]">Nothing to buy</p>
          <p className="mt-2 text-[var(--color-ink-soft)]">All ingredients are already in your pantry.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.name} className="flex items-start justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-[var(--color-ink)]">{item.name}</p>
                  {item.runningLow && (
                    <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">Running low</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-[var(--color-ink-soft)]">Used on: {item.days.join(", ")}</p>
                {item.notes && <p className="mt-0.5 text-xs italic text-[var(--color-ink-soft)]">{item.notes}</p>}
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold text-[var(--color-ink)]">{item.totalGrams}g</p>
                {item.cups && <p className="text-xs text-[var(--color-ink-soft)]">{item.cups}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-[var(--color-ink-soft)]">
        {items.length} item{items.length !== 1 ? "s" : ""} · quantities combined across the week
      </p>

      {/* Competitor comparison banner */}
      {hasCostData && butternut && (
        <div className="mt-8 rounded-3xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] p-6">
          <p className="font-heading text-xl text-[var(--color-ink)]">
            {dogName}&apos;s home-cooked week: ~{currency}{weekCostTotal.toFixed(2)}
          </p>
          <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
            Fresh food delivery for a {butternut.dog_weight_kg}kg dog: ~{currency}{(butternut.their_daily_cost * 7).toFixed(2)}
          </p>
          {butternut.your_saving_daily > 0 && (
            <p className="mt-2 font-semibold text-green-700">
              You save approximately {currency}{(butternut.your_saving_daily * 7).toFixed(2)} this week 🐾
            </p>
          )}
          <p className="mt-3 text-xs italic text-[var(--color-ink-soft)]">
            Competitor estimates based on publicly listed pricing. Actual costs vary.
          </p>
        </div>
      )}
    </div>
  );
}
