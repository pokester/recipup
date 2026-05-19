"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { createClient } from "@/lib/supabase/client";
import { RecipeCard, type Recipe } from "@/components/recipe/RecipeCard";

type DogProfile = Record<string, unknown> & {
  dog_name?: string;
  dog?: {
    breed?: string;
    age_years?: number;
    weight_kg?: number;
    activity_level?: string;
    health_conditions?: string;
    allergens?: string | string[];
  };
};

type GenerateRecipesResponse = {
  dog_name: string;
  daily_calories: number;
  recipes: Recipe[];
  supplement_recommendations: Array<{ name: string; reason: string; daily_amount: string }>;
  vet_flag: boolean;
  vet_message?: string;
  has_cost_access?: boolean;
  market?: "uk" | "nl";
};

function humanizeBreed(breed?: string) {
  if (!breed) return "";
  return breed
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function capitalizeName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatQuantity(n: number) {
  return n.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

export default function RecipesPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "results" | "error" | "missing_profile">("loading");
  const [dogProfile, setDogProfile] = useState<DogProfile | null>(null);
  const [data, setData] = useState<GenerateRecipesResponse | null>(null);
  const [pantryContext, setPantryContext] = useState<string | null>(null);
  const [unavailableEquipment, setUnavailableEquipment] = useState<string[]>([]);
  const [pantryLoaded, setPantryLoaded] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [savedMap, setSavedMap] = useState<Map<string, string>>(new Map());
  const [toast, setToast] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<"monthly_limit_reached" | "rate_limit_exceeded" | null>(null);
  const [showCostUpgrade, setShowCostUpgrade] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const [currentDogId, setCurrentDogId] = useState<string | null>(null);

  const intervalRef = useRef<number | null>(null);

  const rotatingMessages = useMemo(() => {
    const name = dogProfile?.dog_name ?? data?.dog_name ?? "your dog";
    return [
      `Working out ${name}'s daily calorie needs...`,
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
    async (profile: DogProfile, pantryCtx?: string | null) => {
      setStatus("loading");
      setData(null);
      setMessageIndex(0);
      clearIntervalSafe();
      intervalRef.current = window.setInterval(
        () => setMessageIndex((i) => (i + 1) % 5),
        2000,
      );

      let apiError: string | null = null;
      let isApiError = false;
      try {
        setApiErrorMessage(null);
        const res = await fetch("/api/generate-recipes", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...profile,
            ...(pantryCtx ? { pantry_context: pantryCtx } : {}),
          }),
        });

        if (res.status === 401) {
          clearIntervalSafe();
          router.push("/login");
          return;
        }
        if (res.status === 403 || res.status === 429) {
          const errJson = (await res.json()) as { error?: string };
          const code = errJson.error;
          setLimitError(
            code === "monthly_limit_reached" || code === "rate_limit_exceeded"
              ? code
              : "monthly_limit_reached",
          );
          setStatus("error");
          clearIntervalSafe();
          return;
        }
        if (!res.ok) {
          const errJson = (await res.json().catch(() => null)) as {
            message?: string;
          } | null;
          apiError = errJson?.message ?? null;
          isApiError = true;
          if (apiError) setApiErrorMessage(apiError);
          throw new Error("Recipe generation failed");
        }

        const json = (await res.json()) as GenerateRecipesResponse;
        setData(json);
        setStatus("results");
        clearIntervalSafe();
      } catch {
        clearIntervalSafe();
        if (!isApiError) {
          setApiErrorMessage(
            "Unable to generate recipes right now. Please try again later.",
          );
        }
        setStatus("error");
      }
    },
    [clearIntervalSafe, router],
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("recipup_dog_profile");
      if (!raw) {
        startTransition(() => setStatus("missing_profile"));
        return;
      }
      const ctx = window.localStorage.getItem("recipup_pantry_context");
      const unavail = window.localStorage.getItem("recipup_unavailable_equipment");
      const dogId = window.localStorage.getItem("recipup_current_dog_id");
      startTransition(() => {
        setDogProfile(JSON.parse(raw) as DogProfile);
        if (ctx) setPantryContext(ctx);
        if (unavail) setUnavailableEquipment(JSON.parse(unavail) as string[]);
        if (dogId) setCurrentDogId(dogId);
        setPantryLoaded(true);
      });
    } catch {
      startTransition(() => setStatus("missing_profile"));
    }
  }, [router]);

  useEffect(() => {
    if (!dogProfile || !pantryLoaded) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchRecipes is async; state updates occur after API response, not synchronously
    void fetchRecipes(dogProfile, pantryContext);
    return () => clearIntervalSafe();
  }, [clearIntervalSafe, dogProfile, fetchRecipes, pantryContext, pantryLoaded]);

  const dogName = data?.dog_name ?? dogProfile?.dog_name ?? "your dog";
  const displayDogName =
    dogName === "your dog" ? dogName : capitalizeName(dogName);
  const hasCostAccess = data?.has_cost_access ?? false;
  const market = data?.market ?? "uk";
  const currency = market === "nl" ? "€" : "£";

  const dogBreed = dogProfile?.dog?.breed
    ? humanizeBreed(dogProfile.dog.breed)
    : undefined;
  const dogAgeYears = dogProfile?.dog?.age_years;
  const dogWeightKg = dogProfile?.dog?.weight_kg;
  const dogActivityLevel = dogProfile?.dog?.activity_level;
  const dogHealthConditions =
    typeof dogProfile?.dog?.health_conditions === "string"
      ? dogProfile.dog.health_conditions
      : undefined;
  const dogAllergens = dogProfile?.dog?.allergens
    ? Array.isArray(dogProfile.dog.allergens)
      ? dogProfile.dog.allergens.join(", ")
      : dogProfile.dog.allergens
    : undefined;

  const shoppingItems = useMemo(() => {
    if (!data)
      return {
        buy: [] as { name: string; totalGrams: number }[],
        topUp: [] as { name: string; totalGrams: number }[],
      };
    const buyMap = new Map<string, number>();
    const topUpMap = new Map<string, number>();
    for (const recipe of data.recipes) {
      for (const ing of recipe.ingredients) {
        if (ing.needs_purchasing)
          buyMap.set(ing.name, (buyMap.get(ing.name) ?? 0) + ing.grams);
        else if (ing.running_low)
          topUpMap.set(ing.name, (topUpMap.get(ing.name) ?? 0) + ing.grams);
      }
    }
    return {
      buy: Array.from(buyMap.entries()).map(([name, totalGrams]) => ({
        name,
        totalGrams,
      })),
      topUp: Array.from(topUpMap.entries()).map(([name, totalGrams]) => ({
        name,
        totalGrams,
      })),
    };
  }, [data]);

  const equipmentCardsByRecipeId = useMemo(() => {
    if (!data || unavailableEquipment.length === 0)
      return {} as Record<string, string>;
    const seen = new Set<string>();
    const result: Record<string, string> = {};
    const METHOD_EQ: Record<string, string> = {
      slow_cooker: "slow cooker",
      one_pot: "large stock pot",
      oven: "baking tray",
    };
    for (const recipe of data.recipes) {
      const eq = METHOD_EQ[recipe.method];
      if (eq && unavailableEquipment.includes(eq) && !seen.has(eq)) {
        seen.add(eq);
        result[recipe.id] = eq;
      }
    }
    return result;
  }, [data, unavailableEquipment]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleSave = useCallback(
    async (recipe: Recipe) => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      if (savedMap.has(recipe.id)) {
        const rowId = savedMap.get(recipe.id)!;
        const { error } = await supabase
          .from("saved_recipes")
          .delete()
          .eq("id", rowId)
          .eq("user_id", user.id);
        if (!error) {
          setSavedMap((prev) => {
            const next = new Map(prev);
            next.delete(recipe.id);
            return next;
          });
          showToast("Recipe removed from library");
        }
      } else {
        const { data: saved, error } = await supabase
          .from("saved_recipes")
          .insert({
            user_id: user.id,
            recipe_data: recipe as unknown as Record<string, unknown>,
            generated_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (!error && saved) {
          setSavedMap((prev) =>
            new Map(prev).set(recipe.id, (saved as { id: string }).id),
          );
          showToast("Recipe saved to library");
        }
      }
    },
    [savedMap, router, showToast],
  );

  return (
    <div className="min-h-dvh bg-[var(--color-oat)]">
      {/* Cost upgrade modal */}
      {showCostUpgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-8 shadow-[var(--shadow-lift)]">
            <h2 className="font-heading text-2xl text-[var(--color-ink)]">
              See exactly what you&apos;re spending
            </h2>
            <p className="mt-3 text-[var(--color-ink-500)]">
              Upgrade to Pack to see the cost per day for every recipe, compare
              to fresh food delivery services, and track exactly what you&apos;re
              saving.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <a
                href="/account"
                className="rounded-full bg-[var(--color-coral)] px-6 py-3 text-center text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
              >
                Upgrade to Pack →
              </a>
              <button
                type="button"
                onClick={() => setShowCostUpgrade(false)}
                className="rounded-full border border-[var(--color-sand-deep)] px-6 py-3 text-sm font-semibold text-[var(--color-ink)]"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {status === "loading" && (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--color-sand)] px-6 text-center">
          <div className="mb-6">
            <Logo height={48} />
          </div>
          <p className="font-heading text-2xl font-semibold text-[var(--color-coral)]">
            <span className="animate-pulse">{rotatingMessages[messageIndex]}</span>
          </p>
          <p className="mt-3 text-sm text-[var(--color-ink-500)]">
            Building something good for {dogProfile?.dog_name ?? "your dog"}...
          </p>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="mx-auto max-w-md px-6 py-20">
          <div className="rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-8 text-center shadow-[var(--shadow-card)]">
            {limitError === "monthly_limit_reached" ? (
              <>
                <div className="font-heading text-2xl text-[var(--color-ink)]">
                  Monthly limit reached
                </div>
                <p className="mt-3 text-[var(--color-ink-500)]">
                  Free accounts get 3 recipe generations per month. Upgrade to
                  Pack for unlimited recipes.
                </p>
                <a
                  href="/pricing"
                  className="mt-6 inline-block rounded-full bg-[var(--color-coral)] px-6 py-3 text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
                >
                  Upgrade to Pack →
                </a>
              </>
            ) : limitError === "rate_limit_exceeded" ? (
              <>
                <div className="font-heading text-2xl text-[var(--color-ink)]">
                  You&apos;ve been busy!
                </div>
                <p className="mt-3 text-[var(--color-ink-500)]">
                  You&apos;ve generated a lot of recipes this hour — take a short
                  break and try again in a little while.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setLimitError(null);
                    if (dogProfile) void fetchRecipes(dogProfile, pantryContext);
                  }}
                  className="mt-6 inline-block rounded-full border border-[var(--color-sand-deep)] px-6 py-3 text-sm font-semibold text-[var(--color-ink)]"
                >
                  Try again
                </button>
              </>
            ) : (
              <>
                <div className="font-heading text-2xl text-[var(--color-ink)]">
                  Something went wrong.
                </div>
                <p className="mt-3 text-[var(--color-ink-500)]">
                  {apiErrorMessage ??
                    `It happens occasionally — please try again. If the problem persists, try updating ${displayDogName}&apos;s profile.`}
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <button
                    type="button"
                    onClick={() => dogProfile && void fetchRecipes(dogProfile)}
                    className="rounded-full bg-[var(--color-coral)] px-6 py-3 text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5 disabled:opacity-40"
                    disabled={!dogProfile}
                  >
                    Try again
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/onboard")}
                    className="rounded-full border border-[var(--color-sand-deep)] px-6 py-3 text-sm font-semibold text-[var(--color-ink)]"
                  >
                    Edit profile
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Missing profile */}
      {status === "missing_profile" && (
        <div className="mx-auto max-w-md px-6 py-20">
          <div className="rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-8 text-center shadow-[var(--shadow-card)]">
            <div className="font-heading text-2xl text-[var(--color-ink)]">
              Start with your dog&apos;s profile
            </div>
            <p className="mt-3 text-[var(--color-ink-500)]">
              We need a few details about your dog before building recipes.
            </p>
            <button
              type="button"
              onClick={() => router.push("/onboard")}
              className="mt-6 rounded-full bg-[var(--color-coral)] px-6 py-3 text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
            >
              Build my dog&apos;s profile →
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] px-6 py-3 text-sm font-semibold text-[var(--color-ink)] shadow-[var(--shadow-lift)]">
          {toast}
        </div>
      )}

      {/* Results */}
      {status === "results" && data && (
        <div className="mx-auto max-w-5xl px-6 py-10 md:px-8">
          {/* Page header */}
          <header className="pb-10">
            <h1 className="font-heading text-4xl font-semibold text-[var(--color-ink)]">
              Recipes for {displayDogName}
            </h1>
            <p className="mt-3 text-lg text-[var(--color-ink-500)] max-w-2xl">
              Each recipe is personalised to {displayDogName}&apos;s profile,
              breed, and health. Here&apos;s the thinking behind each one.
            </p>
            <p className="mt-2 text-sm text-[var(--color-ink-300)]">
              Daily target: {data.daily_calories} kcal
            </p>

            {/* Global vet flag */}
            {data.vet_flag && data.vet_message && (
              <div
                className="mt-5 rounded-2xl border border-[var(--color-coral-muted)] bg-[var(--color-coral-muted)] px-5 py-4 text-sm text-[var(--color-ink-700)]"
              >
                <p>{data.vet_message}</p>
                <p className="mt-2 font-medium">
                  Recipup recipes are a guide, not medical advice. Always speak
                  to your vet before making significant dietary changes,
                  especially if your dog has a health condition.
                </p>
              </div>
            )}
          </header>

          <div className="space-y-8">
            {/* Recipe cards */}
            {data.recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                dogName={displayDogName}
                dogBreed={dogBreed}
                dogAgeYears={dogAgeYears}
                dogWeightKg={dogWeightKg}
                dogActivityLevel={dogActivityLevel}
                dogHealthConditions={dogHealthConditions}
                dogAllergens={dogAllergens}
                supplements={data.supplement_recommendations}
                vetFlag={data.vet_flag}
                vetMessage={data.vet_message}
                hasCostAccess={hasCostAccess}
                market={market}
                isSaved={savedMap.has(recipe.id)}
                onSave={() => void handleSave(recipe)}
                onCostUpgradeClick={() => setShowCostUpgrade(true)}
                unavailableEquipment={equipmentCardsByRecipeId[recipe.id]}
              />
            ))}

            {/* Aggregated shopping list */}
            {(shoppingItems.buy.length > 0 ||
              shoppingItems.topUp.length > 0) && (
              <section className="rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-6 shadow-[var(--shadow-card)]">
                <h3 className="font-heading text-xl text-[var(--color-ink)]">
                  What to buy for this plan
                </h3>
                <div className="mt-5 grid gap-6 md:grid-cols-2">
                  {shoppingItems.buy.length > 0 && (
                    <div>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-coral)]">
                        Need to buy
                      </p>
                      <div className="divide-y divide-[var(--color-sand-deep)]">
                        {shoppingItems.buy.map((item) => (
                          <div
                            key={item.name}
                            className="flex items-center justify-between py-3"
                          >
                            <span className="text-sm text-[var(--color-ink)]">
                              {item.name}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-[var(--color-ink-500)]">
                                {formatQuantity(item.totalGrams)} g
                              </span>
                              <a
                                href={`https://www.tesco.com/groceries/en-GB/search?query=${encodeURIComponent(item.name)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-full bg-[var(--color-coral)] px-3 py-1 text-xs font-semibold text-[var(--color-warm-white)]"
                              >
                                Buy
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {shoppingItems.topUp.length > 0 && (
                    <div>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-coral-dark)]">
                        Running low — top up soon
                      </p>
                      <div className="divide-y divide-[var(--color-sand-deep)]">
                        {shoppingItems.topUp.map((item) => (
                          <div
                            key={item.name}
                            className="flex items-center justify-between py-3"
                          >
                            <span className="text-sm text-[var(--color-ink)]">
                              {item.name}
                            </span>
                            <span className="text-xs text-[var(--color-ink-500)]">
                              {formatQuantity(item.totalGrams)} g
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <p className="mt-5 text-xs text-[var(--color-ink-300)]">
                  Some shopping links are affiliate links. We may earn a small
                  commission — at no extra cost to you — which helps keep Recipup
                  free.
                </p>
              </section>
            )}

            {/* What's next */}
            {savedMap.size > 0 && (
              <section className="rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-6 shadow-[var(--shadow-card)]">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[var(--color-ink-500)]">
                  What&apos;s next
                </p>
                <div className="space-y-3">
                  {currentDogId && (
                    <Link
                      href={`/dogs/${currentDogId}`}
                      className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-sand-deep)] px-4 py-3 text-sm font-medium text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink-300)] hover:bg-[var(--color-sand)]"
                    >
                      <span>Back to {displayDogName}&apos;s hub</span>
                      <span className="text-[var(--color-ink-300)]">→</span>
                    </Link>
                  )}
                  <Link
                    href="/planner/new"
                    className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-sand-deep)] px-4 py-3 text-sm font-medium text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink-300)] hover:bg-[var(--color-sand)]"
                  >
                    <span>Set up a meal plan</span>
                    <span className="text-[var(--color-ink-300)]">→</span>
                  </Link>
                  <Link
                    href="/pantry"
                    className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-sand-deep)] px-4 py-3 text-sm font-medium text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink-300)] hover:bg-[var(--color-sand)]"
                  >
                    <span>Tell us what&apos;s in your kitchen</span>
                    <span className="text-[var(--color-ink-300)]">→</span>
                  </Link>
                </div>
              </section>
            )}

            {/* Actions row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  dogProfile && void fetchRecipes(dogProfile, pantryContext)
                }
                disabled={!dogProfile}
                className="rounded-full border border-[var(--color-sand-deep)] px-6 py-3 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-sand)] disabled:opacity-40"
              >
                Generate new recipes →
              </button>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => router.push("/onboard")}
                  className="text-sm text-[var(--color-ink-500)] hover:text-[var(--color-ink)]"
                >
                  ← Edit profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      window.localStorage.removeItem("recipup_dog_profile");
                    } catch {
                      /* ignore */
                    }
                    router.push("/onboard");
                  }}
                  className="text-sm text-[var(--color-ink-500)] hover:text-[var(--color-ink)]"
                >
                  Add another dog
                </button>
              </div>
            </div>

            {/* Empty state (shown when no recipes returned) */}
            {data.recipes.length === 0 && (
              <div className="rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-10 text-center">
                <p className="font-heading text-xl text-[var(--color-ink)] mb-3">
                  No recipes yet
                </p>
                <p className="text-sm text-[var(--color-ink-500)]">
                  Create your first recipe by clicking &ldquo;Create new
                  recipes&rdquo; above. We&apos;ll show you exactly why each
                  recipe is built for {displayDogName}.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
