"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type DogOption = { id: string; name: string; breed: string | null };

type LibraryRecipe = {
  id: string;
  recipe_data: {
    name?: string;
    tagline?: string;
    method?: string;
    safety_score?: number;
  };
  dogs: { name: string } | null;
};

type PinnedDay = { day_number: number; day_name: string; recipe_data: Record<string, unknown> };
type CookingFreq = "daily" | "twice_weekly" | "once_weekly";
type PlanType = "weekly" | "monthly";
type BudgetTier = "budget" | "standard" | "premium";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const LOADING_MESSAGES = [
  "Checking {dog}'s nutritional needs...",
  "Balancing the week's recipes...",
  "Making sure there's plenty of variety...",
  "Calculating your shopping list...",
  "Almost ready...",
];

function getNextMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function methodLabel(method?: string): string {
  if (method === "slow_cooker") return "🍲 Slow Cooker";
  if (method === "one_pot") return "🥘 One Pot";
  if (method === "oven") return "🫙 Oven";
  return "";
}

export function PlannerNewWizard({
  initialDogs,
  initialLibrary,
}: {
  initialDogs: DogOption[];
  initialLibrary: LibraryRecipe[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultType = (searchParams.get("type") as PlanType) ?? "weekly";

  const [step, setStep] = useState(1);
  const [dogs] = useState<DogOption[]>(initialDogs);
  const [library] = useState<LibraryRecipe[]>(initialLibrary);

  // Step 1 state
  const [selectedDogId, setSelectedDogId] = useState<string>(dogs[0]?.id ?? "");
  const [planType, setPlanType] = useState<PlanType>(defaultType);
  const [startDate, setStartDate] = useState(getNextMonday());

  // Step 2 state
  const [cookingFreq, setCookingFreq] = useState<CookingFreq>("twice_weekly");
  const [budgetTier, setBudgetTier] = useState<BudgetTier>("standard");

  // Step 3 state
  const [pinnedDays, setPinnedDays] = useState<PinnedDay[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const endDate = useMemo(
    () => addDays(startDate, planType === "weekly" ? 6 : 27),
    [startDate, planType],
  );

  const balanceType = cookingFreq === "daily" ? "per_meal" : "week_balanced";

  const selectedDog = dogs.find((d) => d.id === selectedDogId);

  const canGoNext = useMemo(() => {
    if (step === 1) return !!selectedDogId;
    if (step === 2) return !!cookingFreq && !!budgetTier;
    return true;
  }, [step, selectedDogId, cookingFreq, budgetTier]);

  const handlePinDay = useCallback(
    (dayNumber: number) => {
      if (!selectedRecipeId) return;
      const recipe = library.find((r) => r.id === selectedRecipeId);
      if (!recipe) return;
      setPinnedDays((prev) => {
        const filtered = prev.filter((p) => p.day_number !== dayNumber);
        return [
          ...filtered,
          {
            day_number: dayNumber,
            day_name: DAY_NAMES[dayNumber - 1],
            recipe_data: recipe.recipe_data as unknown as Record<string, unknown>,
          },
        ];
      });
      setSelectedRecipeId(null);
    },
    [selectedRecipeId, library],
  );

  const handleUnpinDay = (dayNumber: number) => {
    setPinnedDays((prev) => prev.filter((p) => p.day_number !== dayNumber));
  };

  const generate = useCallback(async () => {
    if (!selectedDogId) return;
    setGenerating(true);
    setMsgIdx(0);
    intervalRef.current = window.setInterval(() => {
      setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2200);

    try {
      const supabase = createClient();

      // Fetch full dog profile
      const { data: dogData } = await supabase.from("dogs").select("*").eq("id", selectedDogId).single();

      // Create meal_plans row
      const { data: plan, error: planErr } = await supabase
        .from("meal_plans")
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          dog_id: selectedDogId,
          plan_type: planType,
          cooking_frequency: cookingFreq,
          balance_type: balanceType,
          budget_tier: budgetTier,
          start_date: startDate,
          end_date: endDate,
          total_weeks: planType === "monthly" ? 4 : 1,
          week_number: 1,
          status: "active",
        })
        .select("id")
        .single();

      if (planErr || !plan) throw new Error("Failed to create plan");

      // Get pantry context from localStorage
      let pantryContext: string | undefined;
      try {
        const ctx = window.localStorage.getItem("recipup_pantry_context");
        if (ctx) pantryContext = ctx;
      } catch {
        // ignore
      }

      // Call generate-plan-week API
      const res = await fetch("/api/generate-plan-week", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          plan_id: (plan as Record<string, unknown>).id,
          week_number: 1,
          dog_profile: dogData ?? {},
          pantry_context: pantryContext,
          cooking_frequency: cookingFreq,
          balance_type: balanceType,
          budget_tier: budgetTier,
          plan_start_date: startDate,
          pinned_days: pinnedDays.map((p) => ({
            day_number: p.day_number,
            recipe_data: p.recipe_data,
          })),
          existing_recipes: [],
        }),
      });

      if (!res.ok) throw new Error("Generation failed");

      if (intervalRef.current) window.clearInterval(intervalRef.current);
      router.push(`/planner/${(plan as Record<string, unknown>).id as string}`);
    } catch {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      setGenerating(false);
      alert("Something went wrong. Please try again.");
    }
  }, [
    selectedDogId,
    planType,
    cookingFreq,
    balanceType,
    budgetTier,
    startDate,
    endDate,
    pinnedDays,
    router,
  ]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, []);

  if (generating) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <p className="font-heading text-2xl text-[var(--color-accent)]">
          <span className="animate-pulse">{LOADING_MESSAGES[msgIdx].replace("{dog}", selectedDog?.name ?? "your dog")}</span>
        </p>
        <p className="mt-3 text-sm text-[var(--color-ink-soft)]">
          Building {selectedDog?.name ?? "your dog"}&apos;s plan…
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 md:px-10 md:py-14">
      {/* Progress bar */}
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
          Step {step} of 3
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full border ${
                s <= step
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
                  : "border-[var(--color-border-strong)] bg-[var(--color-cream-soft)]"
              }`}
            />
          ))}
        </div>
      </div>

      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] p-6 md:p-8">
        {/* ── Step 1 ── */}
        {step === 1 && (
          <div className="space-y-6">
            <h1 className="font-heading text-3xl text-[var(--color-ink)]">
              Which dog and when?
            </h1>
            <p className="text-[var(--color-ink-soft)]">Let&apos;s set up the basics.</p>

            {/* Dog selector */}
            {dogs.length === 1 ? (
              <div className="rounded-2xl border-2 border-[var(--color-accent)] bg-[var(--color-cream)] p-4">
                <p className="font-semibold text-[var(--color-ink)]">{dogs[0].name}</p>
                {dogs[0].breed && (
                  <p className="text-sm capitalize text-[var(--color-ink-soft)]">
                    {dogs[0].breed.replace(/_/g, " ")}
                  </p>
                )}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {dogs.map((dog) => (
                  <button
                    key={dog.id}
                    type="button"
                    onClick={() => setSelectedDogId(dog.id)}
                    className={`rounded-2xl border p-4 text-left transition-colors ${
                      selectedDogId === dog.id
                        ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-cream)]"
                        : "border-[var(--color-border-strong)] bg-[var(--color-cream)]"
                    }`}
                  >
                    <p className="font-semibold">{dog.name}</p>
                    {dog.breed && (
                      <p className="mt-0.5 text-sm capitalize opacity-80">
                        {dog.breed.replace(/_/g, " ")}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Plan type */}
            <div className="space-y-2">
              <p className="text-sm text-[var(--color-ink-soft)]">Plan type</p>
              <div className="inline-flex rounded-full border border-[var(--color-border-strong)] bg-[var(--color-cream)] p-1">
                {(["weekly", "monthly"] as PlanType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPlanType(t)}
                    className={`rounded-full px-5 py-2 text-sm capitalize transition-colors ${
                      planType === t
                        ? "bg-[var(--color-accent)] text-[var(--color-cream)]"
                        : "text-[var(--color-ink-soft)]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Start date */}
            <div className="space-y-2">
              <p className="text-sm text-[var(--color-ink-soft)]">Start date</p>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-11 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-cream)] px-4 outline-none focus:border-[var(--color-accent)]"
              />
              <p className="text-xs text-[var(--color-ink-soft)]">
                Ends: {formatDate(endDate)}
              </p>
            </div>
          </div>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <div className="space-y-6">
            <h1 className="font-heading text-3xl text-[var(--color-ink)]">
              How do you like to cook?
            </h1>
            <p className="text-[var(--color-ink-soft)]">We&apos;ll build the recipes around your cooking style.</p>

            <div className="grid gap-3">
              {(
                [
                  {
                    id: "daily" as CookingFreq,
                    emoji: "🍳",
                    title: "Cook fresh daily",
                    desc: "Quick meals every day. Each recipe is a single day's portion — maximum freshness, minimum fuss.",
                  },
                  {
                    id: "twice_weekly" as CookingFreq,
                    emoji: "🥘",
                    title: "Cook a few times a week",
                    desc: "Batch cook every 3–4 days. A couple of hours a week, done. We'll balance the nutrition across each batch.",
                  },
                  {
                    id: "once_weekly" as CookingFreq,
                    emoji: "🫙",
                    title: "One big cook a week",
                    desc: "Sunday cook, sorted for the week. One session, seven days of fresh food. We'll balance the whole week nutritionally.",
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCookingFreq(opt.id)}
                  className={`rounded-2xl border p-5 text-left transition-colors ${
                    cookingFreq === opt.id
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
                      : "border-[var(--color-border-strong)] bg-[var(--color-cream)]"
                  }`}
                >
                  <p className="text-2xl">{opt.emoji}</p>
                  <p
                    className={`mt-2 font-semibold ${cookingFreq === opt.id ? "text-[var(--color-cream)]" : "text-[var(--color-ink)]"}`}
                  >
                    {opt.title}
                  </p>
                  <p
                    className={`mt-1 text-sm ${cookingFreq === opt.id ? "text-[var(--color-cream)]/90" : "text-[var(--color-ink-soft)]"}`}
                  >
                    {opt.desc}
                  </p>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-sm text-[var(--color-ink-soft)]">Ingredient budget</p>
              <div className="inline-flex rounded-full border border-[var(--color-border-strong)] bg-[var(--color-cream)] p-1">
                {(["budget", "standard", "premium"] as BudgetTier[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setBudgetTier(t)}
                    className={`rounded-full px-5 py-2 text-sm capitalize transition-colors ${
                      budgetTier === t
                        ? "bg-[var(--color-accent)] text-[var(--color-cream)]"
                        : "text-[var(--color-ink-soft)]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3 ── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="font-heading text-3xl text-[var(--color-ink)]">
                Pin any favourites?
              </h1>
              <p className="mt-2 text-[var(--color-ink-soft)]">
                Want to lock in any recipes from your library? We&apos;ll build the rest of the week around them nutritionally.
              </p>
            </div>

            {/* Day slots */}
            <div>
              <p className="mb-3 text-sm font-semibold text-[var(--color-ink)]">
                Week at a glance
              </p>
              <div className="grid grid-cols-7 gap-1">
                {DAY_NAMES.map((name, idx) => {
                  const dayNum = idx + 1;
                  const pinned = pinnedDays.find((p) => p.day_number === dayNum);
                  const isTarget = !!selectedRecipeId && !pinned;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        if (pinned) {
                          handleUnpinDay(dayNum);
                        } else if (selectedRecipeId) {
                          handlePinDay(dayNum);
                        }
                      }}
                      className={`rounded-xl border p-2 text-center text-xs transition-colors ${
                        pinned
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                          : isTarget
                            ? "border-dashed border-[var(--color-accent)] bg-[var(--color-cream-soft)]"
                            : "border-[var(--color-border)] bg-[var(--color-cream-soft)]"
                      }`}
                    >
                      <p className="font-semibold text-[var(--color-ink)]">
                        {name.slice(0, 3)}
                      </p>
                      <p className="mt-1 truncate text-[var(--color-ink-soft)]">
                        {pinned
                          ? (pinned.recipe_data as Record<string, unknown>).name?.toString().slice(0, 8) + "…"
                          : "Free"}
                      </p>
                    </button>
                  );
                })}
              </div>
              {selectedRecipeId && (
                <p className="mt-2 text-xs text-[var(--color-accent)]">
                  Tap a day slot to pin the selected recipe there.
                </p>
              )}
            </div>

            {/* Library cards */}
            {library.length > 0 && (
              <div>
                <p className="mb-3 text-sm font-semibold text-[var(--color-ink)]">
                  Your saved recipes
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {library.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setSelectedRecipeId((prev) =>
                          prev === item.id ? null : item.id,
                        )
                      }
                      className={`rounded-2xl border p-4 text-left transition-colors ${
                        selectedRecipeId === item.id
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                          : "border-[var(--color-border)] bg-[var(--color-cream)]"
                      }`}
                    >
                      <p className="font-semibold text-[var(--color-ink)]">
                        {item.recipe_data.name ?? "Recipe"}
                      </p>
                      <div className="mt-1 flex gap-2">
                        <span className="text-xs text-[var(--color-ink-soft)]">
                          {methodLabel(item.recipe_data.method)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {library.length === 0 && (
              <p className="text-sm text-[var(--color-ink-soft)]">
                No saved recipes yet — we&apos;ll fill the whole week for you. Click &ldquo;Generate my plan&rdquo; when ready.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Nav */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => (step > 1 ? setStep((s) => s - 1) : router.back())}
          className="rounded-full border border-[var(--color-border-strong)] px-5 py-2 text-sm text-[var(--color-ink)]"
        >
          Back
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canGoNext}
            className="rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-[var(--color-cream)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={generate}
              className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-accent)]"
            >
              Fill the whole week for me →
            </button>
            <button
              type="button"
              onClick={generate}
              className="rounded-full bg-[var(--color-accent)] px-6 py-2.5 text-sm font-semibold text-[var(--color-cream)] transition-transform hover:-translate-y-0.5"
            >
              Generate my plan →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
