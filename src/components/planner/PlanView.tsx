"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type NutritionAvg = { calories: number; protein_g: number; fat_g: number; carbs_g: number };

type Ingredient = {
  name: string;
  grams: number;
  cups: string;
  notes?: string;
  needs_purchasing?: boolean;
  running_low?: boolean;
};

type Recipe = {
  id: string;
  name: string;
  tagline?: string;
  method: "slow_cooker" | "one_pot" | "oven";
  prep_time_mins: number;
  cook_time_mins: number;
  serves_days: number;
  ingredients: Ingredient[];
  instructions: string[];
  nutrition_per_day: { calories: number; protein_g: number; fat_g: number; carbs_g: number; notes?: string };
  safety_score: number;
  safety_notes?: string;
};

type DayRecipeData = {
  day_number: number;
  day_name: string;
  is_pinned: boolean;
  cook_on_day: boolean;
  batch_note?: string | null;
  recipe: Recipe;
};

type MealPlanDay = {
  id: string;
  day_date: string;
  day_number: number;
  recipe_data: DayRecipeData;
  is_pinned: boolean;
  source: string;
};

type MealPlan = {
  id: string;
  dog_id: string;
  plan_type: string;
  cooking_frequency: string;
  balance_type: string;
  budget_tier: string;
  start_date: string;
  end_date: string;
  total_weeks: number;
  week_number: number;
  estimated_weekly_cost_gbp: number | null;
  weekly_nutrition_avg: NutritionAvg | null;
};

type Dog = { name: string; breed: string | null; weight_kg: number | null };

type SwapOption = { option_number: number; recipe: Recipe };

function toTitleCase(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${s.toLocaleDateString("en-GB", opts)} – ${e.toLocaleDateString("en-GB", { ...opts, year: "numeric" })}`;
}

function methodLabel(method: string): string {
  if (method === "slow_cooker") return "🍲 Slow Cooker";
  if (method === "one_pot") return "🥘 One Pot";
  return "🫙 Oven";
}

function cookingModeLabel(freq: string): string {
  if (freq === "daily") return "🍳 Fresh daily";
  if (freq === "twice_weekly") return "🥘 Batch every 3–4 days";
  return "🫙 One weekly cook";
}

function safetyBadgeCls(score: number): string {
  if (score >= 85) return "bg-[var(--color-forest-light)]/10 text-[var(--color-forest)] border-[var(--color-forest-light)]/30";
  if (score >= 70) return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-orange-200 bg-orange-50 text-orange-800";
}

function stripDaySuffix(name: string): string {
  return name.replace(/\s*\(Day \d+\)\s*$/, "").trim();
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function getWeekDays(planStartDate: string, weekNumber: number): { start: string; end: string } {
  const start = addDays(planStartDate, (weekNumber - 1) * 7);
  const end = addDays(start, 6);
  return { start, end };
}

export function PlanView({ planId }: { planId: string }) {
  const router = useRouter();
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [allDays, setAllDays] = useState<MealPlanDay[]>([]);
  const [dog, setDog] = useState<Dog | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentWeek, setCurrentWeek] = useState(1);
  const [generatingWeek, setGeneratingWeek] = useState<number | null>(null);

  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);
  const [swappingDayId, setSwappingDayId] = useState<string | null>(null);
  const [swapOptions, setSwapOptions] = useState<SwapOption[]>([]);
  const [swappingLoading, setSwappingLoading] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data: planData } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("id", planId)
        .eq("user_id", user.id)
        .single();
      if (!planData) { router.replace("/planner"); return; }
      setPlan(planData as unknown as MealPlan);

      const { data: daysData } = await supabase
        .from("meal_plan_days")
        .select("id, day_date, day_number, recipe_data, is_pinned, source")
        .eq("plan_id", planId)
        .order("day_date", { ascending: true });
      setAllDays((daysData ?? []) as unknown as MealPlanDay[]);

      const { data: dogData } = await supabase
        .from("dogs")
        .select("name, breed, weight_kg")
        .eq("id", (planData as Record<string, unknown>).dog_id as string)
        .single();
      setDog(dogData as Dog | null);

      setLoading(false);
    };
    void load();
  }, [planId, router]);

  const weekDays = useMemo(() => {
    if (!plan) return [];
    const { start, end } = getWeekDays(plan.start_date, currentWeek);
    return allDays.filter((d) => d.day_date >= start && d.day_date <= end)
      .sort((a, b) => a.day_number - b.day_number);
  }, [plan, allDays, currentWeek]);

  const weekGenerated = weekDays.length > 0;

  const handleGenerateWeek = useCallback(async () => {
    if (!plan || !dog) return;
    setGeneratingWeek(currentWeek);
    try {
      const supabase = createClient();
      const { data: dogFull } = await supabase.from("dogs").select("*").eq("id", plan.dog_id).single();

      const existingRecipes = allDays
        .filter((d) => {
          const { start, end } = getWeekDays(plan.start_date, currentWeek);
          return d.day_date < start || d.day_date > end;
        })
        .map((d) => d.recipe_data.recipe as unknown as Record<string, unknown>);

      let pantryContext: string | undefined;
      try {
        const ctx = window.localStorage.getItem("recipup_pantry_context");
        if (ctx) pantryContext = ctx;
      } catch { /* ignore */ }

      const res = await fetch("/api/generate-plan-week", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          plan_id: planId,
          week_number: currentWeek,
          dog_profile: dogFull ?? {},
          pantry_context: pantryContext,
          cooking_frequency: plan.cooking_frequency,
          balance_type: plan.balance_type,
          budget_tier: plan.budget_tier,
          plan_start_date: plan.start_date,
          existing_recipes: existingRecipes,
        }),
      });

      if (!res.ok) throw new Error("Generation failed");

      const { data: freshDays } = await supabase
        .from("meal_plan_days")
        .select("id, day_date, day_number, recipe_data, is_pinned, source")
        .eq("plan_id", planId)
        .order("day_date", { ascending: true });
      setAllDays((freshDays ?? []) as unknown as MealPlanDay[]);

      const { data: freshPlan } = await supabase.from("meal_plans").select("*").eq("id", planId).single();
      if (freshPlan) setPlan(freshPlan as unknown as MealPlan);
    } catch {
      setSwapError("Week generation failed. Please try again.");
      setTimeout(() => setSwapError(null), 5000);
    }
    setGeneratingWeek(null);
  }, [plan, dog, planId, currentWeek, allDays]);

  const handleSwapDay = useCallback(async (day: MealPlanDay) => {
    if (!plan || swappingLoading) return;
    setSwappingDayId(day.id);
    setSwapOptions([]);
    setSwappingLoading(true);
    try {
      const supabase = createClient();
      const { data: dogFull } = await supabase.from("dogs").select("*").eq("id", plan.dog_id).single();
      const otherDays = weekDays
        .filter((d) => d.id !== day.id)
        .map((d) => d.recipe_data as unknown as Record<string, unknown>);

      let pantryContext: string | undefined;
      try {
        const ctx = window.localStorage.getItem("recipup_pantry_context");
        if (ctx) pantryContext = ctx;
      } catch { /* ignore */ }

      const res = await fetch("/api/regenerate-day", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          plan_id: planId,
          dog_profile: dogFull ?? {},
          pantry_context: pantryContext,
          day_number: day.day_number,
          day_name: day.recipe_data.day_name,
          existing_week: otherDays,
          balance_type: plan.balance_type,
          budget_tier: plan.budget_tier,
        }),
      });
      if (!res.ok) throw new Error("Regeneration failed");
      const data = (await res.json()) as { options: SwapOption[] };
      setSwapOptions(data.options ?? []);
    } catch {
      setSwapError("Could not load alternatives. Please try again.");
      setTimeout(() => setSwapError(null), 5000);
      setSwappingDayId(null);
    }
    setSwappingLoading(false);
  }, [plan, weekDays, swappingLoading, planId]);

  const handleChooseSwap = useCallback(async (day: MealPlanDay, recipe: Recipe) => {
    const supabase = createClient();
    const updatedRecipeData: DayRecipeData = {
      ...day.recipe_data,
      recipe,
      is_pinned: false,
    };
    await supabase
      .from("meal_plan_days")
      .update({ recipe_data: updatedRecipeData as unknown as Record<string, unknown>, source: "user_edited" })
      .eq("id", day.id);
    setAllDays((prev) =>
      prev.map((d) =>
        d.id === day.id ? { ...d, recipe_data: updatedRecipeData, source: "user_edited" } : d,
      ),
    );
    setSwappingDayId(null);
    setSwapOptions([]);
  }, []);

  const handlePinToggle = useCallback(async (day: MealPlanDay) => {
    const supabase = createClient();
    const newPinned = !day.is_pinned;
    await supabase.from("meal_plan_days").update({ is_pinned: newPinned }).eq("id", day.id);
    setAllDays((prev) => prev.map((d) => (d.id === day.id ? { ...d, is_pinned: newPinned } : d)));
  }, []);

  const handleDeletePlan = useCallback(async () => {
    if (!plan) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/delete-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan_id: planId }),
      });
      if (!res.ok) throw new Error("Failed to delete plan");
      router.push("/planner");
    } catch (err) {
      console.error("Delete plan error:", err);
      setSwapError("Failed to delete plan. Please try again.");
      setTimeout(() => setSwapError(null), 5000);
    }
    setDeleting(false);
    setShowDeleteConfirm(false);
  }, [plan, planId, router]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="animate-pulse text-sm text-[var(--color-ink-500)]">Loading plan…</p>
      </div>
    );
  }

  if (!plan || !dog) return null;

  const totalWeeks = plan.total_weeks ?? 1;
  const isMonthly = plan.plan_type === "monthly";
  const nutritionAvg = plan.weekly_nutrition_avg;
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-[var(--color-ink)] md:text-4xl">
            {toTitleCase(dog.name)}&apos;s{" "}
            {isMonthly
              ? `Month — Week ${currentWeek}`
              : `Week — ${formatDateRange(plan.start_date, plan.end_date)}`}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-[var(--color-sand-deep)] bg-[var(--color-sand)] px-3 py-1 text-xs font-medium text-[var(--color-ink)]">
              {cookingModeLabel(plan.cooking_frequency)}
            </span>
            <span className="text-xs text-[var(--color-ink-500)]">
              {plan.balance_type === "per_meal"
                ? "Each recipe hits daily targets"
                : "Nutritionally balanced across the week"}
            </span>
          </div>
          {nutritionAvg && (
            <p className="mt-3 text-sm text-[var(--color-ink-500)]">
              Week average — {nutritionAvg.calories} kcal · {nutritionAvg.protein_g}g protein ·{" "}
              {nutritionAvg.fat_g}g fat · {nutritionAvg.carbs_g}g carbs per day
            </p>
          )}
          {plan.estimated_weekly_cost_gbp != null && (
            <p className="mt-2 text-sm font-semibold text-[var(--color-coral)]">
              Est. week cost: £{plan.estimated_weekly_cost_gbp.toFixed(2)} · £{(plan.estimated_weekly_cost_gbp / 7).toFixed(2)}/day
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Link
            href={`/planner/${planId}/shopping`}
            className="rounded-full bg-[var(--color-coral)] px-5 py-2.5 text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
          >
            Shopping list →
          </Link>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-full border border-red-300 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-700 transition-transform hover:-translate-y-0.5 hover:bg-red-100"
          >
            Delete plan
          </button>
        </div>
      </div>

      {/* Monthly week tabs */}
      {isMonthly && (
        <div className="mb-6 flex gap-1 overflow-x-auto pb-1">
          {Array.from({ length: totalWeeks }).map((_, i) => {
            const w = i + 1;
            const { start, end } = getWeekDays(plan.start_date, w);
            const hasData = allDays.some((d) => d.day_date >= start && d.day_date <= end);
            return (
              <button
                key={w}
                type="button"
                onClick={() => setCurrentWeek(w)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  currentWeek === w
                    ? "border-[var(--color-coral)] bg-[var(--color-coral)] text-[var(--color-warm-white)]"
                    : "border-[var(--color-sand-deep)] bg-[var(--color-sand)] text-[var(--color-ink-500)]"
                }`}
              >
                Week {w} {!hasData ? "·" : "✓"}
              </button>
            );
          })}
        </div>
      )}

      {/* Generate week prompt (monthly) */}
      {isMonthly && !weekGenerated && (
        <div className="mb-8 rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-10 text-center shadow-[var(--shadow-card)]">
          <p className="font-heading text-2xl text-[var(--color-ink)]">Week {currentWeek} not generated yet</p>
          <p className="mt-2 text-[var(--color-ink-500)]">
            Generate this week&apos;s recipes — we&apos;ll make sure there&apos;s variety across your whole month.
          </p>
          <button
            type="button"
            onClick={handleGenerateWeek}
            disabled={generatingWeek === currentWeek}
            className={`mt-6 rounded-full bg-[var(--color-coral)] px-7 py-3 text-sm font-semibold text-[var(--color-warm-white)] ${
              generatingWeek === currentWeek ? "animate-pulse" : "transition-transform hover:-translate-y-0.5"
            }`}
          >
            {generatingWeek === currentWeek ? "Generating…" : `Generate week ${currentWeek} →`}
          </button>
          {swapError && (
            <p className="text-coral text-sm font-sans mt-2">{swapError}</p>
          )}
        </div>
      )}

      {/* Calendar grid — desktop / list — mobile */}
      {weekGenerated && (
        <>
          {/* Desktop 7-column grid */}
          <div className="hidden grid-cols-7 gap-3 lg:grid">
            {weekDays.map((day) => {
              const rd = day.recipe_data;
              const recipe = rd.recipe;
              const isSwapping = swappingDayId === day.id;
              const isToday = day.day_date === today;
              return (
                <div key={day.id} className="flex flex-col">
                  <div
                    className={`flex flex-1 flex-col rounded-2xl border p-3 ${
                      isToday
                        ? "border-2 border-[var(--color-coral)] bg-[var(--color-warm-white)]"
                        : day.is_pinned
                        ? "border-[var(--color-sand-deep)] bg-[var(--color-sand)]"
                        : "border-[var(--color-sand-deep)] bg-[var(--color-warm-white)]"
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">
                          {rd.day_name.slice(0, 3)}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--color-ink-300)]">
                          {new Date(day.day_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      {day.is_pinned && (
                        <button
                          type="button"
                          onClick={() => void handlePinToggle(day)}
                          title="Pinned — click to unpin"
                          className="text-[var(--color-ink-300)] hover:text-[var(--color-coral)]"
                        >
                          📌
                        </button>
                      )}
                    </div>
                    <p className="font-heading text-sm leading-tight text-[var(--color-ink)]">
                      {stripDaySuffix(recipe.name)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="rounded-full border border-[var(--color-sand-deep)] bg-[var(--color-sand)] px-2 py-0.5 text-xs text-[var(--color-ink-500)]">
                        {methodLabel(recipe.method)}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${safetyBadgeCls(recipe.safety_score)}`}>
                        {recipe.safety_score}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs">
                      {rd.cook_on_day ? (
                        <span className="flex items-center gap-1 text-green-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Cook today
                        </span>
                      ) : (
                        <span className="text-[var(--color-ink-300)]">From batch</span>
                      )}
                    </div>
                    {rd.batch_note && (
                      <p className="mt-1 text-xs italic text-[var(--color-ink-300)]">{rd.batch_note}</p>
                    )}
                    {!day.is_pinned && (
                      <button
                        type="button"
                        onClick={() => isSwapping ? (setSwappingDayId(null), setSwapOptions([])) : void handleSwapDay(day)}
                        className="mt-3 text-xs font-semibold text-[var(--color-coral)] hover:underline"
                      >
                        {isSwapping ? "Cancel swap" : "Swap day"}
                      </button>
                    )}
                  </div>

                  {/* Swap options */}
                  {isSwapping && (
                    <div className="mt-2 space-y-2">
                      {swapError && (
                        <p className="text-coral text-sm font-sans mt-2">{swapError}</p>
                      )}
                      {swappingLoading ? (
                        <p className="animate-pulse text-center text-xs text-[var(--color-ink-500)]">
                          Finding alternatives…
                        </p>
                      ) : (
                        swapOptions.map((opt) => (
                          <div
                            key={opt.option_number}
                            className="rounded-xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-3"
                          >
                            <p className="text-xs font-semibold text-[var(--color-coral)]">
                              Option {opt.option_number}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-[var(--color-ink)]">
                              {stripDaySuffix(opt.recipe.name)}
                            </p>
                            <p className="text-xs text-[var(--color-ink-500)]">
                              {methodLabel(opt.recipe.method)} · {opt.recipe.prep_time_mins + opt.recipe.cook_time_mins} min
                            </p>
                            <button
                              type="button"
                              onClick={() => void handleChooseSwap(day, opt.recipe)}
                              className="mt-2 rounded-full bg-[var(--color-coral)] px-3 py-1 text-xs font-semibold text-[var(--color-warm-white)]"
                            >
                              Choose this
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile vertical list */}
          <div className="space-y-3 lg:hidden">
            {weekDays.map((day) => {
              const rd = day.recipe_data;
              const recipe = rd.recipe;
              const isExpanded = expandedDayId === day.id;
              const isSwapping = swappingDayId === day.id;
              const isToday = day.day_date === today;
              return (
                <div
                  key={day.id}
                  className={`rounded-2xl border ${
                    isToday
                      ? "border-2 border-[var(--color-coral)] bg-[var(--color-warm-white)]"
                      : day.is_pinned
                      ? "border-[var(--color-sand-deep)] bg-[var(--color-sand)]"
                      : "border-[var(--color-sand-deep)] bg-[var(--color-warm-white)]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedDayId(isExpanded ? null : day.id)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left"
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">
                        {rd.day_name}
                      </p>
                      <p className="mt-0.5 font-heading text-lg text-[var(--color-ink)]">
                        {stripDaySuffix(recipe.name)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {rd.cook_on_day && <span className="h-2 w-2 rounded-full bg-green-500" />}
                      <span className="text-xs text-[var(--color-ink-300)]">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-[var(--color-sand-deep)] px-5 pb-5 pt-4">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-[var(--color-sand-deep)] bg-[var(--color-sand)] px-3 py-1 text-xs text-[var(--color-ink-500)]">
                          {methodLabel(recipe.method)}
                        </span>
                        <span className={`rounded-full border px-3 py-1 text-xs ${safetyBadgeCls(recipe.safety_score)}`}>
                          Safety {recipe.safety_score}
                        </span>
                      </div>
                      {rd.cook_on_day ? (
                        <p className="mt-3 flex items-center gap-1.5 text-sm text-green-700">
                          <span className="h-2 w-2 rounded-full bg-green-500" /> Cook today
                        </p>
                      ) : (
                        <p className="mt-3 text-sm text-[var(--color-ink-500)]">From batch</p>
                      )}
                      {rd.batch_note && (
                        <p className="mt-1 text-sm italic text-[var(--color-ink-500)]">{rd.batch_note}</p>
                      )}
                      <div className="mt-4 space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Ingredients</p>
                        {recipe.ingredients.map((ing) => (
                          <p key={ing.name} className="text-sm text-[var(--color-ink)]">
                            {ing.name} — <span className="font-medium text-[var(--color-coral)]">{ing.grams}g</span>
                          </p>
                        ))}
                      </div>
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)]">Instructions</p>
                        {recipe.instructions.map((step, i) => (
                          <div key={i} className="flex gap-3">
                            <span className="shrink-0 font-heading text-xl font-semibold leading-none text-[var(--color-coral)]/30">{i + 1}</span>
                            <span className="text-sm text-[var(--color-ink)]">{step}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 rounded-xl bg-[var(--color-sand)] px-4 py-3 text-xs text-[var(--color-ink-500)]">
                        {recipe.nutrition_per_day.calories} kcal · {recipe.nutrition_per_day.protein_g}g protein · {recipe.nutrition_per_day.fat_g}g fat · {recipe.nutrition_per_day.carbs_g}g carbs
                      </div>
                      {!day.is_pinned && (
                        <button
                          type="button"
                          onClick={() => isSwapping ? (setSwappingDayId(null), setSwapOptions([])) : void handleSwapDay(day)}
                          className="mt-4 text-sm font-semibold text-[var(--color-coral)] hover:underline"
                        >
                          {isSwapping ? "Cancel swap" : "Swap day"}
                        </button>
                      )}
                      {isSwapping && (
                        <div className="mt-3 space-y-3">
                          {swapError && (
                            <p className="text-coral text-sm font-sans mt-2">{swapError}</p>
                          )}
                          {swappingLoading ? (
                            <p className="animate-pulse text-sm text-[var(--color-ink-500)]">Finding alternatives…</p>
                          ) : (
                            swapOptions.map((opt) => (
                              <div key={opt.option_number} className="rounded-xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-4">
                                <p className="text-xs font-semibold text-[var(--color-coral)]">Option {opt.option_number}</p>
                                <p className="mt-1 font-semibold text-[var(--color-ink)]">{stripDaySuffix(opt.recipe.name)}</p>
                                <p className="text-sm text-[var(--color-ink-500)]">{opt.recipe.tagline}</p>
                                <p className="text-xs text-[var(--color-ink-500)]">
                                  {methodLabel(opt.recipe.method)} · {opt.recipe.prep_time_mins + opt.recipe.cook_time_mins} min
                                </p>
                                <button
                                  type="button"
                                  onClick={() => void handleChooseSwap(day, opt.recipe)}
                                  className="mt-3 rounded-full bg-[var(--color-coral)] px-4 py-1.5 text-sm font-semibold text-[var(--color-warm-white)]"
                                >
                                  Choose this
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="mt-8 flex gap-3">
        <Link
          href="/planner"
          className="rounded-full border border-[var(--color-sand-deep)] px-5 py-2 text-sm font-semibold text-[var(--color-ink)]"
        >
          ← All plans
        </Link>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60">
          <div className="mx-4 max-w-md rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-6 shadow-xl">
            <h3 className="font-heading text-xl text-[var(--color-ink)]">Delete this plan?</h3>
            <p className="mt-2 text-sm text-[var(--color-ink-500)]">
              This will permanently delete the plan for {toTitleCase(dog?.name ?? "")} and all associated recipes. This cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-full border border-[var(--color-sand-deep)] py-2 text-sm font-semibold text-[var(--color-ink)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeletePlan()}
                disabled={deleting}
                className="flex-1 rounded-full bg-red-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
