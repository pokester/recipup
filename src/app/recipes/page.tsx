"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";

type DogProfile = Record<string, unknown> & {
  dog_name?: string;
  dog?: { breed?: string };
};

type Ingredient = {
  name: string;
  grams: number;
  cups: string;
  notes?: string;
};

type Recipe = {
  id: string;
  name: string;
  tagline: string;
  method: "slow_cooker" | "one_pot" | "oven";
  prep_time_mins: number;
  cook_time_mins: number;
  serves_days: number;
  ingredients: Ingredient[];
  instructions: string[];
  nutrition_per_day: {
    calories: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
    notes: string;
  };
  safety_score: number;
  safety_notes: string;
  breed_notes?: string;
};

type GenerateRecipesResponse = {
  dog_name: string;
  daily_calories: number;
  recipes: Recipe[];
  supplement_recommendations: Array<{
    name: string;
    reason: string;
    daily_amount: string;
  }>;
  vet_flag: boolean;
  vet_message?: string;
};

function humanizeBreed(breed?: string) {
  if (!breed) return "";
  const cleaned = breed.replace(/_/g, " ");
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseFractionOrDecimal(value: string): number | null {
  const cleaned = value.trim().toLowerCase();
  // Extract something like "1/2", "1 1/2", "0.5"
  const match = cleaned.match(/(\d+\s+\d+\/\d+)|(\d+\/\d+)|(\d+(\.\d+)?)/);
  if (!match) return null;

  const mixed = match[1];
  const frac = match[2];
  const dec = match[3];

  if (mixed) {
    // "1 1/2"
    const [wholeStr, fracStr] = mixed.split(" ");
    const [a, b] = fracStr.split("/");
    const whole = Number(wholeStr);
    const num = Number(a);
    const den = Number(b);
    if (!Number.isFinite(whole) || !Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
    return whole + num / den;
  }

  if (frac) {
    const [a, b] = frac.split("/");
    const num = Number(a);
    const den = Number(b);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
    return num / den;
  }

  if (dec) {
    const n = Number(dec);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

function formatQuantity(n: number) {
  // Keep it simple and readable (cookbook-ish): trim trailing zeros.
  const fixed = n.toFixed(2);
  return fixed.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

function safetyBadge(score: number) {
  if (score >= 85)
    return {
      label: "✓ Excellent",
      className: "border-green-700/30 bg-green-50 text-green-800",
    };
  if (score >= 70)
    return {
      label: "✓ Good",
      className: "border-amber-700/30 bg-amber-50 text-amber-900",
    };
  if (score >= 50)
    return {
      label: "⚠ Use with care",
      className: "border-orange-700/30 bg-orange-50 text-orange-900",
    };
  return null;
}

export default function RecipesPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "results" | "error">("loading");
  const [dogProfile] = useState<DogProfile | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem("recipup_dog_profile");
      if (!raw) return null;
      return JSON.parse(raw) as DogProfile;
    } catch {
      return null;
    }
  });
  const [data, setData] = useState<GenerateRecipesResponse | null>(null);

  const [messageIndex, setMessageIndex] = useState(0);
  const [gramsMode, setGramsMode] = useState<"grams" | "cups">("grams");
  const [batchDays, setBatchDays] = useState<1 | 3 | 7>(1);

  const intervalRef = useRef<number | null>(null);

  const rotatingMessages = useMemo(() => {
    const name = dogProfile?.dog_name || data?.dog_name || "your pup";
    return [
      `Calculating ${name}'s daily calories...`,
      `Checking breed-specific nutrition rules...`,
      `Crafting your first recipe...`,
      `Running safety checks...`,
      `Almost ready...`,
    ];
  }, [dogProfile, data]);

  const clearIntervalSafe = useCallback(() => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  const fetchRecipes = useCallback(
    async (profile: DogProfile) => {
    setStatus("loading");
    setData(null);
    setMessageIndex(0);

    clearIntervalSafe();
    intervalRef.current = window.setInterval(() => {
      setMessageIndex((i) => (i + 1) % 5);
    }, 2000);

    try {
      const res = await fetch("/api/generate-recipes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(profile),
      });

      if (!res.ok) {
        throw new Error("Recipe generation failed");
      }

      const json = (await res.json()) as GenerateRecipesResponse;
      setData(json);
      setStatus("results");
      clearIntervalSafe();
    } catch {
      clearIntervalSafe();
      setStatus("error");
    }
    },
    [clearIntervalSafe],
  );

  useEffect(() => {
    if (!dogProfile) {
      router.replace("/onboard");
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRecipes(dogProfile);
    return () => clearIntervalSafe();
  }, [clearIntervalSafe, dogProfile, fetchRecipes, router]);

  const dogName = data?.dog_name || dogProfile?.dog_name || "your pup";

  const multiplier = batchDays;

  const handleEditProfile = () => {
    router.push("/onboard");
  };

  const handleAddAnotherDog = () => {
    try {
      window.localStorage.removeItem("recipup_dog_profile");
    } catch {
      // ignore
    }
    router.push("/onboard");
  };

  return (
    <div
      className="min-h-screen bg-[#FAF7F2] text-[#2C2416]"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {status === "loading" && (
        <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <div className="mb-6">
            <Logo height={48} />
          </div>
          <p className="font-heading text-2xl font-semibold text-[#C97D4E]">
            <span className="animate-pulse">{rotatingMessages[messageIndex]}</span>
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="mx-auto max-w-3xl px-6 py-12">
          <div className="space-y-5 rounded-3xl border border-[#E9D7C5] bg-white p-8">
            <div className="font-heading text-3xl text-[#2C2416]">
              Something went wrong generating {dogName}&apos;s recipes.
            </div>
            <p className="text-[#6A5445]">
              Please try again or edit your profile.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => dogProfile && fetchRecipes(dogProfile)}
                className="rounded-full bg-[#C97D4E] px-6 py-3 text-sm font-semibold text-[#FAF7F2] transition-transform hover:-translate-y-0.5"
                disabled={!dogProfile}
              >
                Try again
              </button>
              <button
                type="button"
                onClick={handleEditProfile}
                className="rounded-full border border-[#D4B49A] px-6 py-3 text-sm font-semibold text-[#2C2416]"
              >
                Edit profile
              </button>
            </div>
          </div>
        </div>
      )}

      {status === "results" && data && (
        <div className="mx-auto max-w-5xl px-6 py-10 md:px-8">
          <header className="space-y-4">
            <div className="font-heading text-4xl text-[#2C2416]">
              {dogName}&apos;s Recipe Plan
            </div>
            <p className="text-[#6A5445]">
              Daily target: {data.daily_calories} kcal
            </p>

            {data.vet_flag && data.vet_message && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-100 px-4 py-3 text-amber-950">
                {data.vet_message}
              </div>
            )}
          </header>

          <div className="mt-8 space-y-8">
            {data.recipes.map((recipe) => {
              const badge = safetyBadge(recipe.safety_score);
              const methodLabel =
                recipe.method === "slow_cooker"
                  ? "🍲 Slow Cooker"
                  : recipe.method === "one_pot"
                    ? "🥘 One Pot"
                    : "🫙 Oven";

              return (
                <article
                  key={recipe.id}
                  className="rounded-3xl border border-[#E9D7C5] bg-white p-7"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                      <h2 className="font-heading text-3xl">{recipe.name}</h2>
                      <p className="italic text-[#6A5445]">{recipe.tagline}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full border border-[#C97D4E] bg-[#FFF3E8] px-4 py-2 text-sm font-semibold text-[#C97D4E]">
                        {methodLabel}
                      </span>
                      {badge && (
                        <span className={`rounded-full border px-4 py-2 text-sm font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                      )}
                    </div>

                    {recipe.breed_notes && dogProfile?.dog?.breed && (
                      <p className="mt-2 italic text-[#C97D4E]">
                        Tailored for{" "}
                        {humanizeBreed(String(dogProfile.dog.breed))}:{" "}
                        {recipe.breed_notes}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-[#6A5445]">
                      <div>Prep: {recipe.prep_time_mins} mins</div>
                      <div>Cook: {recipe.cook_time_mins} mins</div>
                      <div>Serves {recipe.serves_days} days</div>
                    </div>
                  </div>

                  <div className="mt-7 space-y-6">
                    <section>
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setGramsMode("grams")}
                            className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                              gramsMode === "grams"
                                ? "border-[#C97D4E] bg-[#C97D4E] text-[#FAF7F2]"
                                : "border-[#D4B49A] bg-white text-[#2C2416]"
                            }`}
                          >
                            Grams
                          </button>
                          <button
                            type="button"
                            onClick={() => setGramsMode("cups")}
                            className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                              gramsMode === "cups"
                                ? "border-[#C97D4E] bg-[#C97D4E] text-[#FAF7F2]"
                                : "border-[#D4B49A] bg-white text-[#2C2416]"
                            }`}
                          >
                            Cups
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {[1, 3, 7].map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setBatchDays(d as 1 | 3 | 7)}
                              className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                                batchDays === d
                                  ? "border-[#C97D4E] bg-[#C97D4E] text-[#FAF7F2]"
                                  : "border-[#D4B49A] bg-white text-[#2C2416]"
                              }`}
                            >
                              {d === 1 ? "1 day" : d === 3 ? "3 days" : "1 week"}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="grid grid-cols-3 gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#C97D4E]">
                          <div>Ingredient</div>
                          <div className="text-right">Grams</div>
                          <div className="text-right">Cups</div>
                        </div>

                        {recipe.ingredients.map((ing) => {
                          const scaledGrams = ing.grams * multiplier;
                          const cupsNum = parseFractionOrDecimal(ing.cups);
                          const scaledCups =
                            cupsNum === null ? null : cupsNum * multiplier;
                          const primaryIsGrams = gramsMode === "grams";

                          return (
                            <div
                              key={ing.name}
                              className="grid grid-cols-3 gap-3 rounded-2xl border border-[#E9D7C5] bg-[#FAF7F2] px-4 py-3"
                            >
                              <div>
                                <div className="font-semibold text-[#2C2416]">
                                  {ing.name}
                                </div>
                                {ing.notes && (
                                  <div className="mt-1 text-xs text-[#6A5445]">
                                    {ing.notes}
                                  </div>
                                )}
                              </div>
                              <div
                                className={`text-right font-semibold ${
                                  primaryIsGrams ? "text-[#C97D4E]" : "text-[#2C2416]"
                                }`}
                              >
                                {formatQuantity(scaledGrams)} g
                              </div>
                              <div
                                className={`text-right ${
                                  primaryIsGrams ? "text-[#6A5445]" : "text-[#C97D4E] font-semibold"
                                }`}
                              >
                                {scaledCups === null ? ing.cups : `${formatQuantity(scaledCups)} cups`}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>

                    <section>
                      <h3 className="font-heading text-2xl">Instructions</h3>
                      <div className="mt-3 space-y-3">
                        {recipe.instructions.map((stepText, idx) => (
                          <div
                            key={`${recipe.id}-step-${idx}`}
                            className="rounded-2xl bg-[#FFF3E8] px-4 py-3"
                          >
                            <div className="font-heading text-[#C97D4E]">
                              {idx + 1}.
                            </div>
                            <div className="mt-1 text-[#2C2416]">{stepText}</div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section>
                      <div className="rounded-2xl border border-[#E9D7C5] bg-[#FAF7F2] p-4">
                        <div className="grid grid-cols-4 gap-3">
                          <Stat label="Calories" value={`${recipe.nutrition_per_day.calories}`} />
                          <Stat label="Protein" value={`${recipe.nutrition_per_day.protein_g} g`} />
                          <Stat label="Fat" value={`${recipe.nutrition_per_day.fat_g} g`} />
                          <Stat label="Carbs" value={`${recipe.nutrition_per_day.carbs_g} g`} />
                        </div>
                        <p className="mt-3 text-sm text-[#6A5445]">
                          {recipe.nutrition_per_day.notes}
                        </p>
                      </div>
                    </section>
                  </div>
                </article>
              );
            })}

            {data.supplement_recommendations.length > 0 && (
              <section className="rounded-3xl border border-[#E9D7C5] bg-white p-7">
                <h3 className="font-heading text-2xl text-[#2C2416]">
                  Recommended supplements for {dogName}
                </h3>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {data.supplement_recommendations.map((s) => (
                    <div
                      key={s.name}
                      className="rounded-2xl border border-[#E9D7C5] bg-[#FAF7F2] p-4"
                    >
                      <div className="font-heading text-xl font-semibold">
                        {s.name}
                      </div>
                      <p className="mt-2 text-sm text-[#6A5445]">{s.reason}</p>
                      <div className="mt-3 inline-flex rounded-full bg-[#C97D4E] px-4 py-2 text-sm font-semibold text-[#FAF7F2]">
                        {s.daily_amount}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="flex flex-col gap-3 pt-2 md:flex-row md:items-center md:justify-between">
              <button
                type="button"
                onClick={handleEditProfile}
                className="rounded-full border border-[#D4B49A] px-6 py-3 text-sm font-semibold text-[#2C2416]"
              >
                ← Edit profile
              </button>

              <button
                type="button"
                onClick={() => dogProfile && fetchRecipes(dogProfile)}
                disabled={!dogProfile}
                className="rounded-full bg-[#C97D4E] px-6 py-3 text-sm font-semibold text-[#FAF7F2] transition-transform hover:-translate-y-0.5 disabled:opacity-40"
              >
                Generate new recipes
              </button>

              <button
                type="button"
                onClick={handleAddAnotherDog}
                className="rounded-full border border-[#D4B49A] px-6 py-3 text-sm font-semibold text-[#2C2416]"
              >
                Add another dog
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E9D7C5] bg-white px-3 py-3 text-center">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#C97D4E]">
        {label}
      </div>
      <div className="mt-1 font-heading text-[#2C2416]">{value}</div>
    </div>
  );
}
