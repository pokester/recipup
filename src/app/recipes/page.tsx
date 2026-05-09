"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { createClient } from "@/lib/supabase/client";

type DogProfile = Record<string, unknown> & {
  dog_name?: string;
  dog?: { breed?: string };
};

type Ingredient = {
  name: string;
  grams: number;
  cups: string;
  notes?: string;
  needs_purchasing?: boolean;
  running_low?: boolean;
};

type IngredientCost = {
  name: string;
  grams: number;
  cost: number | null;
  matched_name: string;
  is_estimated: boolean;
};

type KibbleComparison = {
  daily_saving_vs_kibble: number;
  monthly_saving_vs_kibble: number;
  cheaper_than_kibble: boolean;
  vs_butternut_box_daily: number;
  vs_tails_daily: number;
  baseline_source: "user_entered" | "estimate";
  message_honest: string;
  message_reframe: string;
};

type CompetitorComparison = {
  brand: string;
  their_daily_cost: number;
  your_saving_daily: number;
  your_saving_monthly: number;
  dog_weight_kg: number;
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
  nutrition_per_day: { calories: number; protein_g: number; fat_g: number; carbs_g: number; notes: string };
  safety_score: number;
  safety_notes: string;
  breed_notes?: string;
  // Cost fields (attached server-side)
  cost_per_day_gbp?: number;
  cost_per_day_eur?: number;
  cost_breakdown?: IngredientCost[];
  has_unpriced_items?: boolean;
  unpriced_items?: string[];
  price_sync_date?: string | null;
  kibble_comparison?: KibbleComparison;
  competitor_comparisons?: CompetitorComparison[];
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
  return breed.replace(/_/g, " ").split(" ").filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

function parseFractionOrDecimal(value: string): number | null {
  const cleaned = value.trim().toLowerCase();
  const match = cleaned.match(/(\d+\s+\d+\/\d+)|(\d+\/\d+)|(\d+(\.\d+)?)/);
  if (!match) return null;
  const [mixed, frac, dec] = [match[1], match[2], match[3]];
  if (mixed) {
    const [w, f] = mixed.split(" ");
    const [a, b] = f.split("/");
    return Number(w) + Number(a) / Number(b);
  }
  if (frac) { const [a, b] = frac.split("/"); return Number(a) / Number(b); }
  if (dec) { const n = Number(dec); return Number.isFinite(n) ? n : null; }
  return null;
}

function formatQuantity(n: number) {
  return n.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

function safetyBadge(score: number) {
  if (score >= 85) return { label: "✓ Excellent", className: "border-green-700/30 bg-green-50 text-green-800" };
  if (score >= 70) return { label: "✓ Good", className: "border-amber-700/30 bg-amber-50 text-amber-900" };
  if (score >= 50) return { label: "⚠ Use with care", className: "border-orange-700/30 bg-orange-50 text-orange-900" };
  return null;
}

export default function RecipesPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "results" | "error">("loading");
  const [dogProfile, setDogProfile] = useState<DogProfile | null>(null);
  const [data, setData] = useState<GenerateRecipesResponse | null>(null);
  const [pantryContext, setPantryContext] = useState<string | null>(null);
  const [unavailableEquipment, setUnavailableEquipment] = useState<string[]>([]);
  const [pantryLoaded, setPantryLoaded] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [gramsMode, setGramsMode] = useState<"grams" | "cups">("grams");
  const [batchDays, setBatchDays] = useState<1 | 3 | 7>(1);
  const [savedMap, setSavedMap] = useState<Map<string, string>>(new Map());
  const [toast, setToast] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  // Cost UI state
  const [expandedCostId, setExpandedCostId] = useState<string | null>(null);
  const [expandedCompetitorId, setExpandedCompetitorId] = useState<string | null>(null);
  const [showCostUpgrade, setShowCostUpgrade] = useState(false);

  const intervalRef = useRef<number | null>(null);

  const rotatingMessages = useMemo(() => {
    const name = dogProfile?.dog_name || data?.dog_name || "your dog";
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

  const fetchRecipes = useCallback(async (profile: DogProfile, pantryCtx?: string | null) => {
    setStatus("loading");
    setData(null);
    setMessageIndex(0);
    setGramsMode("grams");
    setBatchDays(1);
    setExpandedCostId(null);
    setExpandedCompetitorId(null);

    clearIntervalSafe();
    intervalRef.current = window.setInterval(() => setMessageIndex((i) => (i + 1) % 5), 2000);

    try {
      const res = await fetch("/api/generate-recipes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...profile, ...(pantryCtx ? { pantry_context: pantryCtx } : {}) }),
      });

      if (res.status === 403) { setShowUpgrade(true); setStatus("error"); clearIntervalSafe(); return; }
      if (!res.ok) throw new Error("Recipe generation failed");

      const json = (await res.json()) as GenerateRecipesResponse;
      setData(json);
      setStatus("results");
      clearIntervalSafe();
    } catch {
      clearIntervalSafe();
      setStatus("error");
    }
  }, [clearIntervalSafe]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("recipup_dog_profile");
      if (!raw) { router.replace("/onboard"); return; }
      setDogProfile(JSON.parse(raw) as DogProfile);
      const ctx = window.localStorage.getItem("recipup_pantry_context");
      if (ctx) setPantryContext(ctx);
      const unavail = window.localStorage.getItem("recipup_unavailable_equipment");
      if (unavail) setUnavailableEquipment(JSON.parse(unavail) as string[]);
    } catch { router.replace("/onboard"); return; }
    setPantryLoaded(true);
  }, [router]);

  useEffect(() => {
    if (!dogProfile || !pantryLoaded) return;
    fetchRecipes(dogProfile, pantryContext);
    return () => clearIntervalSafe();
  }, [clearIntervalSafe, dogProfile, fetchRecipes, pantryContext, pantryLoaded]);

  const dogName = data?.dog_name || dogProfile?.dog_name || "your dog";
  const multiplier = batchDays;
  const hasCostAccess = data?.has_cost_access ?? false;
  const market = data?.market ?? "uk";
  const currency = market === "nl" ? "€" : "£";

  const shoppingItems = useMemo(() => {
    if (!data) return { buy: [] as { name: string; totalGrams: number }[], topUp: [] as { name: string; totalGrams: number }[] };
    const buyMap = new Map<string, number>();
    const topUpMap = new Map<string, number>();
    for (const recipe of data.recipes) {
      for (const ing of recipe.ingredients) {
        if (ing.needs_purchasing) buyMap.set(ing.name, (buyMap.get(ing.name) ?? 0) + ing.grams);
        else if (ing.running_low) topUpMap.set(ing.name, (topUpMap.get(ing.name) ?? 0) + ing.grams);
      }
    }
    return {
      buy: Array.from(buyMap.entries()).map(([name, totalGrams]) => ({ name, totalGrams })),
      topUp: Array.from(topUpMap.entries()).map(([name, totalGrams]) => ({ name, totalGrams })),
    };
  }, [data]);

  const equipmentCardsByRecipeId = useMemo(() => {
    if (!data || unavailableEquipment.length === 0) return {} as Record<string, string>;
    const seen = new Set<string>();
    const result: Record<string, string> = {};
    const METHOD_EQ: Record<string, string> = { slow_cooker: "slow cooker", one_pot: "large stock pot", oven: "baking tray" };
    for (const recipe of data.recipes) {
      const eq = METHOD_EQ[recipe.method];
      if (eq && unavailableEquipment.includes(eq) && !seen.has(eq)) { seen.add(eq); result[recipe.id] = eq; }
    }
    return result;
  }, [data, unavailableEquipment]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleSave = useCallback(async (recipe: Recipe) => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    if (savedMap.has(recipe.id)) {
      const rowId = savedMap.get(recipe.id)!;
      const { error } = await supabase.from("saved_recipes").delete().eq("id", rowId).eq("user_id", user.id);
      if (!error) {
        setSavedMap((prev) => { const next = new Map(prev); next.delete(recipe.id); return next; });
        showToast("Recipe removed from library");
      }
    } else {
      const { data: saved, error } = await supabase.from("saved_recipes")
        .insert({ user_id: user.id, recipe_data: recipe as unknown as Record<string, unknown>, generated_at: new Date().toISOString() })
        .select("id").single();
      if (!error && saved) {
        setSavedMap((prev) => new Map(prev).set(recipe.id, (saved as { id: string }).id));
        showToast("Recipe saved to library");
      }
    }
  }, [savedMap, router, showToast]);

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2C2416]" style={{ fontFamily: "var(--font-body)" }}>
      {/* Cost upgrade modal */}
      {showCostUpgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-3xl border border-[#E9D7C5] bg-white p-8 shadow-xl">
            <h2 className="font-heading text-2xl text-[#2C2416]">See exactly what you&apos;re spending</h2>
            <p className="mt-3 text-[#6A5445]">Upgrade to Pack to see the cost per day for every recipe, compare to fresh food delivery services, and track exactly what you&apos;re saving.</p>
            <div className="mt-6 flex flex-col gap-3">
              <a href="/account" className="rounded-full bg-[#C97D4E] px-6 py-3 text-center text-sm font-semibold text-[#FAF7F2] transition-transform hover:-translate-y-0.5">
                Upgrade to Pack →
              </a>
              <button type="button" onClick={() => setShowCostUpgrade(false)} className="rounded-full border border-[#D4B49A] px-6 py-3 text-sm font-semibold text-[#2C2416]">
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}

      {status === "loading" && (
        <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <div className="mb-6"><Logo height={48} /></div>
          <p className="font-heading text-2xl font-semibold text-[#C97D4E]">
            <span className="animate-pulse">{rotatingMessages[messageIndex]}</span>
          </p>
          <p className="mt-3 text-sm text-[#9A7B6A]">Building something good for {dogProfile?.dog_name || "your dog"}...</p>
        </div>
      )}

      {status === "error" && (
        <div className="mx-auto max-w-3xl px-6 py-12">
          <div className="space-y-5 rounded-3xl border border-[#E9D7C5] bg-white p-8">
            {showUpgrade ? (
              <>
                <div className="font-heading text-3xl text-[#2C2416]">Monthly limit reached</div>
                <p className="text-[#6A5445]">Free accounts get 3 recipe generations per month. Upgrade to Pack for unlimited recipes.</p>
                <a href="/account" className="inline-block rounded-full bg-[#C97D4E] px-6 py-3 text-sm font-semibold text-[#FAF7F2] transition-transform hover:-translate-y-0.5">Upgrade to Pack</a>
              </>
            ) : (
              <>
                <div className="font-heading text-3xl text-[#2C2416]">Something went wrong.</div>
                <p className="text-[#6A5445]">It happens occasionally — please try again. If the problem persists, try updating {dogName}&apos;s profile.</p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={() => dogProfile && fetchRecipes(dogProfile)} className="rounded-full bg-[#C97D4E] px-6 py-3 text-sm font-semibold text-[#FAF7F2] transition-transform hover:-translate-y-0.5" disabled={!dogProfile}>Try again</button>
                  <button type="button" onClick={() => router.push("/onboard")} className="rounded-full border border-[#D4B49A] px-6 py-3 text-sm font-semibold text-[#2C2416]">Edit profile</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[#E9D7C5] bg-white px-6 py-3 text-sm font-semibold text-[#2C2416] shadow-lg">{toast}</div>
      )}

      {status === "results" && data && (
        <div className="mx-auto max-w-5xl px-6 py-10 md:px-8">
          <header className="space-y-4">
            <div className="font-heading text-4xl text-[#2C2416]">{dogName}&apos;s Recipe Plan</div>
            <p className="text-[#6A5445]">Daily target: {data.daily_calories} kcal</p>
            {data.vet_flag && data.vet_message && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-100 px-4 py-3 text-amber-950">{data.vet_message}</div>
            )}
          </header>

          <div className="mt-8 space-y-8">
            {data.recipes.map((recipe) => {
              const badge = safetyBadge(recipe.safety_score);
              const methodLabel = recipe.method === "slow_cooker" ? "🍲 Slow Cooker" : recipe.method === "one_pot" ? "🥘 One Pot" : "🫙 Oven";
              const dailyCost = recipe.cost_per_day_gbp ?? recipe.cost_per_day_eur;
              const isCostExpanded = expandedCostId === recipe.id;
              const isCompetitorExpanded = expandedCompetitorId === recipe.id;
              const syncDate = recipe.price_sync_date ? new Date(recipe.price_sync_date).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : null;
              const supermarket = market === "nl" ? "Albert Heijn" : "Tesco";

              return (
                <article key={recipe.id} className="rounded-3xl border border-[#E9D7C5] bg-white p-7">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-2">
                        <h2 className="font-heading text-3xl">{recipe.name}</h2>
                        <p className="italic text-[#6A5445]">{recipe.tagline}</p>
                      </div>
                      {process.env.NEXT_PUBLIC_SUPABASE_URL && (
                        <button type="button" onClick={() => void handleSave(recipe)} aria-label={savedMap.has(recipe.id) ? "Unsave recipe" : "Save recipe"} className="shrink-0 rounded-full border border-[#E9D7C5] p-2.5 text-[#C97D4E] transition-colors hover:bg-[#FFF3E8]">
                          <svg viewBox="0 0 24 24" className="h-5 w-5" fill={savedMap.has(recipe.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} aria-hidden>
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Badges row: method + safety + cost */}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full border border-[#C97D4E] bg-[#FFF3E8] px-4 py-2 text-sm font-semibold text-[#C97D4E]">{methodLabel}</span>
                      {badge && <span className={`rounded-full border px-4 py-2 text-sm font-semibold ${badge.className}`}>{badge.label}</span>}

                      {/* Cost badge */}
                      {hasCostAccess && dailyCost !== undefined && dailyCost > 0 ? (
                        <button
                          type="button"
                          onClick={() => setExpandedCostId(isCostExpanded ? null : recipe.id)}
                          className="rounded-full border border-[#C97D4E] bg-[#FFF3E8] px-4 py-2 text-sm font-semibold text-[#C97D4E] hover:bg-[#FFE8D4]"
                        >
                          ~{currency}{dailyCost.toFixed(2)}/day {isCostExpanded ? "▲" : "▼"}
                        </button>
                      ) : !hasCostAccess ? (
                        <button
                          type="button"
                          onClick={() => setShowCostUpgrade(true)}
                          className="rounded-full border border-[#D4B49A] bg-[#FAF7F2] px-4 py-2 text-sm font-semibold text-[#9A7B6A] opacity-70 hover:opacity-90"
                        >
                          🔒 Upgrade to see costs
                        </button>
                      ) : null}
                    </div>

                    {/* Cost breakdown panel */}
                    {isCostExpanded && hasCostAccess && recipe.cost_breakdown && (
                      <div className="mt-1 rounded-2xl border border-[#E9D7C5] bg-[#FFF9F4] p-5">
                        <p className="text-sm font-semibold text-[#C97D4E]">Cost breakdown · 1 day</p>
                        <div className="mt-3 space-y-1.5">
                          {recipe.cost_breakdown.map((item) => (
                            <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                              <span className="text-[#2C2416]">{item.matched_name !== item.name ? item.matched_name : item.name} ({item.grams}g){item.is_estimated ? " ~" : ""}</span>
                              <span className="font-semibold text-[#2C2416]">{item.cost !== null ? `${currency}${item.cost.toFixed(2)}` : "—"}</span>
                            </div>
                          ))}
                          <div className="mt-2 border-t border-[#E9D7C5] pt-2">
                            <div className="flex items-center justify-between text-sm font-semibold">
                              <span className="text-[#C97D4E]">Per day</span>
                              <span className="text-[#2C2416]">{currency}{(dailyCost ?? 0).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                        {recipe.has_unpriced_items && (
                          <p className="mt-2 text-xs italic text-[#6A5445]">* Some ingredients could not be priced and are excluded from this total.</p>
                        )}
                        <p className="mt-2 text-xs text-[#9A7B6A]">Prices from {supermarket}{syncDate ? ` · Updated ${syncDate}` : ""} · <a href="#" className="underline">Affiliate disclosure</a></p>

                        {/* Kibble comparison */}
                        {recipe.kibble_comparison && (
                          <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${recipe.kibble_comparison.cheaper_than_kibble ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
                            <p className="font-semibold text-[#2C2416]">
                              {recipe.kibble_comparison.cheaper_than_kibble ? "💚" : "💛"} {recipe.kibble_comparison.message_honest}
                            </p>
                            <p className="mt-1 text-[#6A5445]">{recipe.kibble_comparison.message_reframe}</p>
                            {recipe.kibble_comparison.baseline_source === "estimate" && (
                              <p className="mt-1 text-xs text-[#9A7B6A]">Based on typical kibble costs for your dog&apos;s size.</p>
                            )}
                          </div>
                        )}

                        {/* Competitor comparison collapsible */}
                        {recipe.competitor_comparisons && recipe.competitor_comparisons.length > 0 && (
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() => setExpandedCompetitorId(isCompetitorExpanded ? null : recipe.id)}
                              className="text-xs font-semibold text-[#C97D4E] hover:underline"
                            >
                              vs fresh food delivery {isCompetitorExpanded ? "▲" : "›"}
                            </button>
                            {isCompetitorExpanded && (
                              <div className="mt-2 space-y-1.5">
                                {recipe.competitor_comparisons.map((comp) => (
                                  <div key={comp.brand} className="flex items-center justify-between text-xs">
                                    <span className="text-[#6A5445]">approx. {comp.brand}: ~{currency}{comp.their_daily_cost.toFixed(2)}/day for a {comp.dog_weight_kg}kg dog</span>
                                    {comp.your_saving_daily > 0 && (
                                      <span className="font-semibold text-green-700">save ~{currency}{comp.your_saving_monthly.toFixed(0)}/mo</span>
                                    )}
                                  </div>
                                ))}
                                <p className="mt-1 text-xs italic text-[#9A7B6A]">
                                  Competitor prices are publicly listed estimates scaled to {dogName}&apos;s weight and may vary.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {equipmentCardsByRecipeId[recipe.id] && (
                      <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3">
                        <p className="text-sm font-semibold text-amber-900">This recipe requires a {equipmentCardsByRecipeId[recipe.id]}</p>
                        <a href={`https://www.amazon.co.uk/s?k=${encodeURIComponent(equipmentCardsByRecipeId[recipe.id])}`} target="_blank" rel="noopener noreferrer sponsored" className="mt-2 inline-block text-sm font-semibold text-[#C97D4E] hover:underline">Shop on Amazon UK →</a>
                        <p className="mt-1 text-xs text-[#6A5445]">Affiliate link — we may earn a small commission at no extra cost to you.</p>
                      </div>
                    )}

                    {recipe.breed_notes && dogProfile?.dog?.breed && (
                      <p className="mt-2 italic text-[#C97D4E]">Tailored for {humanizeBreed(String(dogProfile.dog.breed))}: {recipe.breed_notes}</p>
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
                          {(["grams", "cups"] as const).map((mode) => (
                            <button key={mode} type="button" onClick={() => setGramsMode(mode)}
                              className={`rounded-full border px-4 py-2 text-sm font-semibold ${gramsMode === mode ? "border-[#C97D4E] bg-[#C97D4E] text-[#FAF7F2]" : "border-[#D4B49A] bg-white text-[#2C2416]"}`}>
                              {mode.charAt(0).toUpperCase() + mode.slice(1)}
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {[1, 3, 7].map((d) => (
                            <button key={d} type="button" onClick={() => setBatchDays(d as 1 | 3 | 7)}
                              className={`rounded-full border px-4 py-2 text-sm font-semibold ${batchDays === d ? "border-[#C97D4E] bg-[#C97D4E] text-[#FAF7F2]" : "border-[#D4B49A] bg-white text-[#2C2416]"}`}>
                              {d === 1 ? "1 day" : d === 3 ? "3 days" : "1 week"}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="grid grid-cols-3 gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#C97D4E]">
                          <div>Ingredient</div><div className="text-right">Grams</div><div className="text-right">Cups</div>
                        </div>
                        {recipe.ingredients.map((ing) => {
                          const scaledGrams = ing.grams * multiplier;
                          const cupsNum = parseFractionOrDecimal(ing.cups);
                          const scaledCups = cupsNum === null ? null : cupsNum * multiplier;
                          const primaryIsGrams = gramsMode === "grams";
                          return (
                            <div key={ing.name} className="grid grid-cols-3 gap-3 rounded-2xl border border-[#E9D7C5] bg-[#FAF7F2] px-4 py-3">
                              <div>
                                <div className="font-semibold text-[#2C2416]">{ing.name}</div>
                                {ing.needs_purchasing && (
                                  <a href={`https://www.tesco.com/groceries/en-GB/search?query=${encodeURIComponent(ing.name)}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block rounded-full bg-[#C97D4E] px-2 py-0.5 text-xs font-semibold text-white">Buy</a>
                                )}
                                {ing.running_low && !ing.needs_purchasing && <span className="mt-1 inline-block text-xs font-medium text-amber-700">Running low</span>}
                                {ing.notes && <div className="mt-1 text-xs text-[#6A5445]">{ing.notes}</div>}
                              </div>
                              <div className={`text-right font-semibold ${primaryIsGrams ? "text-[#C97D4E]" : "text-[#2C2416]"}`}>{formatQuantity(scaledGrams)} g</div>
                              <div className={`text-right ${primaryIsGrams ? "text-[#6A5445]" : "text-[#C97D4E] font-semibold"}`}>{scaledCups === null ? ing.cups : `${formatQuantity(scaledCups)} cups`}</div>
                            </div>
                          );
                        })}
                      </div>
                    </section>

                    <section>
                      <h3 className="font-heading text-2xl">Instructions</h3>
                      <div className="mt-3 space-y-3">
                        {recipe.instructions.map((stepText, idx) => (
                          <div key={`${recipe.id}-step-${idx}`} className="rounded-2xl bg-[#FFF3E8] px-4 py-3">
                            <div className="font-heading text-[#C97D4E]">{idx + 1}.</div>
                            <div className="mt-1 text-[#2C2416]">{stepText}</div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section>
                      <div className="rounded-2xl border border-[#E9D7C5] bg-[#FAF7F2] px-5 py-4">
                        <p className="text-sm font-semibold text-[#C97D4E]">
                          Per day &mdash;{" "}
                          <span className="font-normal text-[#2C2416]">
                            {recipe.nutrition_per_day.calories} kcal &middot; {recipe.nutrition_per_day.protein_g}g protein &middot; {recipe.nutrition_per_day.fat_g}g fat &middot; {recipe.nutrition_per_day.carbs_g}g carbs
                          </span>
                        </p>
                        <p className="mt-2 text-sm text-[#6A5445]">{recipe.nutrition_per_day.notes}</p>
                      </div>
                    </section>
                  </div>
                </article>
              );
            })}

            {data.supplement_recommendations.length > 0 && (
              <section className="rounded-3xl border border-[#E9D7C5] bg-white p-7">
                <h3 className="font-heading text-2xl text-[#2C2416]">A little extra support for {dogName} 🐾</h3>
                <p className="mt-2 text-sm text-[#6A5445]">Home-cooked food is brilliant. These supplements fill the small gaps that whole ingredients alone can&apos;t always cover.</p>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {data.supplement_recommendations.map((s) => (
                    <div key={s.name} className="rounded-2xl border border-[#E9D7C5] bg-[#FAF7F2] p-4">
                      <div className="font-heading text-xl font-semibold">{s.name}</div>
                      <p className="mt-2 text-sm text-[#6A5445]">{s.reason}</p>
                      <p className="mt-2 text-sm text-[#2C2416]"><span className="font-semibold">How much:</span> {s.daily_amount}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(shoppingItems.buy.length > 0 || shoppingItems.topUp.length > 0) && (
              <section className="rounded-3xl border border-[#E9D7C5] bg-white p-7">
                <h3 className="font-heading text-2xl text-[#2C2416]">What to buy for this plan 🛒</h3>
                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  {shoppingItems.buy.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-[#C97D4E]">Need to buy</h4>
                      <div className="mt-3 space-y-2">
                        {shoppingItems.buy.map((item) => (
                          <div key={item.name} className="flex items-center justify-between rounded-xl border border-[#E9D7C5] bg-[#FAF7F2] px-4 py-2">
                            <span className="text-sm text-[#2C2416]">{item.name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-[#6A5445]">{formatQuantity(item.totalGrams)} g</span>
                              <a href={`https://www.tesco.com/groceries/en-GB/search?query=${encodeURIComponent(item.name)}`} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#C97D4E] px-3 py-1 text-xs font-semibold text-white">Buy</a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {shoppingItems.topUp.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-amber-700">Running low — top up soon 🟡</h4>
                      <div className="mt-3 space-y-2">
                        {shoppingItems.topUp.map((item) => (
                          <div key={item.name} className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-2">
                            <span className="text-sm text-[#2C2416]">{item.name}</span>
                            <span className="text-xs text-amber-700">{formatQuantity(item.totalGrams)} g</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <p className="mt-4 text-xs text-[#6A5445]">Some shopping links are affiliate links. We may earn a small commission — at no extra cost to you — which helps keep Recipup free.</p>
              </section>
            )}

            <div className="flex flex-col gap-3 pt-2 md:flex-row md:items-center md:justify-between">
              <button type="button" onClick={() => router.push("/onboard")} className="rounded-full border border-[#D4B49A] px-6 py-3 text-sm font-semibold text-[#2C2416]">← Edit profile</button>
              <button type="button" onClick={() => dogProfile && fetchRecipes(dogProfile, pantryContext)} disabled={!dogProfile} className="rounded-full bg-[#C97D4E] px-6 py-3 text-sm font-semibold text-[#FAF7F2] transition-transform hover:-translate-y-0.5 disabled:opacity-40">Generate new recipes</button>
              <button type="button" onClick={() => { try { window.localStorage.removeItem("recipup_dog_profile"); } catch { } router.push("/onboard"); }} className="rounded-full border border-[#D4B49A] px-6 py-3 text-sm font-semibold text-[#2C2416]">Add another dog</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
