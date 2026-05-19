"use client";

import { useState } from "react";

/* ---------- Types -------------------------------------------------------- */

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
  cheaper_than_kibble: boolean;
  message_honest: string;
  message_reframe: string;
  baseline_source: string;
};

type CompetitorComparison = {
  brand: string;
  their_daily_cost: number;
  your_saving_daily: number;
  your_saving_monthly: number;
  dog_weight_kg: number;
};

export type Recipe = {
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
  cost_per_day_gbp?: number;
  cost_per_day_eur?: number;
  cost_breakdown?: IngredientCost[];
  has_unpriced_items?: boolean;
  price_sync_date?: string | null;
  kibble_comparison?: KibbleComparison;
  competitor_comparisons?: CompetitorComparison[];
};

export type Supplement = {
  name: string;
  reason: string;
  daily_amount: string;
};

export type RecipeCardProps = {
  recipe: Recipe;
  dogName: string;
  dogBreed?: string;
  dogAgeYears?: number;
  dogWeightKg?: number;
  dogActivityLevel?: string;
  dogHealthConditions?: string;
  dogAllergens?: string;
  supplements?: Supplement[];
  vetFlag?: boolean;
  vetMessage?: string;
  hasCostAccess: boolean;
  market: "uk" | "nl";
  isSaved: boolean;
  onSave: () => void;
  onAddToPlan?: () => void;
  onCostUpgradeClick?: () => void;
  unavailableEquipment?: string;
};

/* ---------- Helpers ------------------------------------------------------ */

function fmtQty(n: number) {
  return n.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

function parseCups(value: string): number | null {
  const m = value.trim().match(/(\d+\s+\d+\/\d+)|(\d+\/\d+)|(\d+(\.\d+)?)/);
  if (!m) return null;
  if (m[1]) {
    const [w, f] = m[1].split(" ");
    const [a, b] = f.split("/");
    return +w + +a / +b;
  }
  if (m[2]) { const [a, b] = m[2].split("/"); return +a / +b; }
  if (m[3]) { const n = +m[3]; return isFinite(n) ? n : null; }
  return null;
}

/* ---------- ExpandableSection ------------------------------------------- */

function ExpandableSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[var(--color-border)]">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        data-expandable-trigger=""
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between py-4 px-2 hover:bg-[var(--color-oat)] transition-colors text-left"
      >
        <span className="text-xs font-semibold text-[var(--color-ink)] uppercase tracking-wider">
          {title}
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 text-[var(--color-ink-500)] shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div
        data-expandable-content=""
        className={`grid overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
        aria-hidden={!isOpen}
      >
        <div className="overflow-hidden">
          <div className="px-2 pb-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- RecipeCard --------------------------------------------------- */

export function RecipeCard({
  recipe,
  dogName,
  dogBreed,
  dogAgeYears,
  dogWeightKg,
  dogActivityLevel,
  dogHealthConditions,
  dogAllergens,
  supplements = [],
  vetFlag = false,
  vetMessage,
  hasCostAccess,
  market,
  isSaved,
  onSave,
  onAddToPlan,
  onCostUpgradeClick,
  unavailableEquipment,
}: RecipeCardProps) {
  const [gramsMode, setGramsMode] = useState<"grams" | "cups">("grams");
  const [batchDays, setBatchDays] = useState(1);
  const [costExpanded, setCostExpanded] = useState(false);
  const [competitorExpanded, setCompetitorExpanded] = useState(false);

  /* Macro caloric breakdown */
  const proteinKcal = Math.round(recipe.nutrition_per_day.protein_g * 4);
  const fatKcal = Math.round(recipe.nutrition_per_day.fat_g * 9);
  const carbsKcal = Math.round(recipe.nutrition_per_day.carbs_g * 4);
  const macroKcalTotal = proteinKcal + fatKcal + carbsKcal;
  const proteinPct = macroKcalTotal > 0 ? Math.round((proteinKcal / macroKcalTotal) * 100) : 0;
  const fatPct = macroKcalTotal > 0 ? Math.round((fatKcal / macroKcalTotal) * 100) : 0;
  const carbsPct = macroKcalTotal > 0 ? 100 - proteinPct - fatPct : 0;

  const currency = market === "nl" ? "€" : "£";
  const supermarket = market === "nl" ? "Albert Heijn" : "Tesco";
  const dailyCost =
    market === "nl" ? recipe.cost_per_day_eur : recipe.cost_per_day_gbp;
  const syncDate = recipe.price_sync_date
    ? new Date(recipe.price_sync_date).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      })
    : null;

  const methodLabel =
    recipe.method === "slow_cooker"
      ? "Slow cooker"
      : recipe.method === "one_pot"
        ? "One pot"
        : "Oven";

  /* Safety badge */
  const safetyScore = recipe.safety_score / 10;
  const safetyLabel =
    safetyScore >= 8.5
      ? "Mineral-balanced"
      : safetyScore >= 7
        ? "Good coverage"
        : "Review recommended";
  const safetyBg =
    safetyScore >= 8.5
      ? "var(--color-sage)"
      : safetyScore >= 7
        ? "var(--color-butter)"
        : "var(--color-coral)";
  const safetyFg =
    safetyScore >= 8.5 ? "#fff" : safetyScore >= 7 ? "var(--color-ink)" : "#fff";

  /* Coverage derived from available data */
  const isComplete = safetyScore >= 8.5;
  const coverageSummary =
    recipe.nutrition_per_day.notes ||
    (isComplete
      ? "Complete & balanced to FEDIAF guidelines"
      : "Add the supplements below to complete the nutritional profile");

  /* "Built For" identity string */
  const dogIdentity = [
    dogBreed,
    dogAgeYears ? `${dogAgeYears}yrs` : null,
    dogWeightKg ? `${dogWeightKg}kg` : null,
    dogActivityLevel ? `${dogActivityLevel} activity` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-warm-white)] shadow-[var(--shadow-card)] overflow-hidden">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="p-6 border-b border-[var(--color-border)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-2xl font-semibold text-[var(--color-ink)] leading-snug">
              {recipe.name}
            </h2>
            <p className="mt-1 text-sm italic text-[var(--color-ink-500)]">
              {recipe.tagline}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-xs text-[var(--color-ink-500)]">
              <span>{methodLabel}</span>
              <span>·</span>
              <span>{recipe.prep_time_mins}min prep</span>
              <span>·</span>
              <span>{recipe.cook_time_mins}min cook</span>
              <span>·</span>
              <span>
                Serves {recipe.serves_days} day
                {recipe.serves_days !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <div
              className="rounded-full px-3 py-1.5 text-xs font-medium"
              style={{ background: safetyBg, color: safetyFg }}
            >
              ✓ {safetyLabel}
            </div>
            <span className="text-xs text-[var(--color-ink-500)]">
              Safety: {safetyScore.toFixed(1)}/10
            </span>
            {process.env.NEXT_PUBLIC_SUPABASE_URL && (
              <button
                type="button"
                onClick={onSave}
                aria-label={isSaved ? "Unsave recipe" : "Save recipe"}
                className="rounded-full border border-[var(--color-border)] p-2 text-[var(--color-coral)] hover:bg-[var(--color-coral-muted)] transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill={isSaved ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Built For [Dog Name] — always visible ─────────────────────── */}
      <div className="px-6 py-5 bg-[var(--color-sage-muted)] border-b border-[var(--color-border)]">
        <p className="text-xs font-semibold text-[var(--color-sage)] uppercase tracking-wider mb-3">
          Built for {dogName}
        </p>
        <ul className="space-y-1.5 text-sm text-[var(--color-ink)]">
          {dogIdentity && (
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-sage)] mt-1.5 shrink-0" aria-hidden="true" />
              <strong>{dogIdentity}</strong>
            </li>
          )}
          {recipe.breed_notes && (
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-sage-light)] mt-1.5 shrink-0" aria-hidden="true" />
              {recipe.breed_notes}
            </li>
          )}
          {dogHealthConditions && (
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-sage)] mt-1.5 shrink-0" aria-hidden="true" />
              {dogHealthConditions}
            </li>
          )}
          {dogAllergens && (
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-coral)] mt-1.5 shrink-0" aria-hidden="true" />
              {dogAllergens}
            </li>
          )}
          {!dogIdentity && !recipe.breed_notes && !dogHealthConditions && !dogAllergens && (
            <li className="text-[var(--color-ink-500)]">
              Personalised to {dogName}&apos;s nutritional needs
            </li>
          )}
        </ul>
      </div>

      {/* ── Expandable sections ───────────────────────────────────────── */}
      <div className="px-4">

        {/* Nutrition Per Day */}
        <ExpandableSection title="Nutrition Per Day" defaultOpen={true}>
          {/* Calorie hero */}
          <div className="flex items-baseline gap-2 pt-3 pb-4">
            <span className="font-heading text-[2.5rem] font-semibold leading-none text-[var(--color-ink)]">
              {recipe.nutrition_per_day.calories}
            </span>
            <span className="text-sm text-[var(--color-ink-500)]">kcal / day</span>
          </div>

          {/* Macro proportion bar */}
          {macroKcalTotal > 0 && (
            <>
              <div className="flex rounded-full overflow-hidden h-2 mb-2" role="img" aria-label={`Macros: protein ${proteinPct}%, fat ${fatPct}%, carbs ${carbsPct}%`}>
                <div style={{ width: `${proteinPct}%` }} className="bg-[var(--color-sage)]" />
                <div style={{ width: `${fatPct}%` }} className="bg-[var(--color-coral)]" />
                <div style={{ width: `${carbsPct}%` }} className="bg-[var(--color-butter)]" />
              </div>
              <div className="flex justify-between mb-5 px-0.5">
                <span className="flex items-center gap-1 text-[0.65rem] text-[var(--color-ink-500)]">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-sage)]" aria-hidden="true" />
                  Protein {proteinPct}%
                </span>
                <span className="flex items-center gap-1 text-[0.65rem] text-[var(--color-ink-500)]">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-coral)]" aria-hidden="true" />
                  Fat {fatPct}%
                </span>
                <span className="flex items-center gap-1 text-[0.65rem] text-[var(--color-ink-500)]">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-butter)]" aria-hidden="true" />
                  Carbs {carbsPct}%
                </span>
              </div>
            </>
          )}

          {/* Macro detail cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-[var(--color-sage-muted)] p-3">
              <div className="text-[0.6rem] font-semibold text-[var(--color-forest)] uppercase tracking-widest mb-2.5">
                Protein
              </div>
              <div className="font-semibold text-[var(--color-ink)] text-lg leading-none">
                {recipe.nutrition_per_day.protein_g}g
              </div>
              {macroKcalTotal > 0 && (
                <div className="text-[0.65rem] text-[var(--color-ink-500)] mt-1.5 leading-snug">
                  {proteinKcal} kcal
                  <br />
                  {proteinPct}% of cals
                </div>
              )}
            </div>

            <div className="rounded-xl bg-[var(--color-coral-muted)] p-3">
              <div className="text-[0.6rem] font-semibold text-[var(--color-coral)] uppercase tracking-widest mb-2.5">
                Fat
              </div>
              <div className="font-semibold text-[var(--color-ink)] text-lg leading-none">
                {recipe.nutrition_per_day.fat_g}g
              </div>
              {macroKcalTotal > 0 && (
                <div className="text-[0.65rem] text-[var(--color-ink-500)] mt-1.5 leading-snug">
                  {fatKcal} kcal
                  <br />
                  {fatPct}% of cals
                </div>
              )}
            </div>

            <div className="rounded-xl bg-[var(--color-butter-muted)] p-3">
              <div className="text-[0.6rem] font-semibold text-[var(--color-ink-500)] uppercase tracking-widest mb-2.5">
                Carbs
              </div>
              <div className="font-semibold text-[var(--color-ink)] text-lg leading-none">
                {recipe.nutrition_per_day.carbs_g}g
              </div>
              {macroKcalTotal > 0 && (
                <div className="text-[0.65rem] text-[var(--color-ink-500)] mt-1.5 leading-snug">
                  {carbsKcal} kcal
                  <br />
                  {carbsPct}% of cals
                </div>
              )}
            </div>
          </div>

          {recipe.nutrition_per_day.notes && (
            <div className="mt-4 rounded-lg bg-[var(--color-sage-muted)] px-4 py-3">
              <p className="text-sm text-[var(--color-forest)] leading-relaxed">
                {recipe.nutrition_per_day.notes}
              </p>
            </div>
          )}
        </ExpandableSection>

        {/* What This Recipe Covers */}
        <ExpandableSection title="Nutritional Completeness" defaultOpen={true}>
          <div className="pt-2 space-y-3">
            <div
              className={`rounded-xl p-4 ${
                isComplete
                  ? "bg-[var(--color-sage-muted)]"
                  : "bg-[var(--color-butter-muted)]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{
                    background: isComplete ? "var(--color-sage)" : "var(--color-butter)",
                  }}
                >
                  {isComplete ? (
                    <svg viewBox="0 0 12 12" className="w-3 h-3 text-[var(--color-warm-white)]" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                      <path d="M2.5 6l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 12 12" className="w-3 h-3 text-[var(--color-ink)]" fill="currentColor" aria-hidden="true">
                      <path d="M6 2a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 6 2zm0 6.5a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5z" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-ink)] leading-snug">
                    {isComplete ? "Complete & balanced" : "Supplement support recommended"}
                  </p>
                  <p className="text-sm text-[var(--color-ink-500)] mt-1 leading-relaxed">{coverageSummary}</p>
                </div>
              </div>
            </div>
            {supplements.length > 0 && !isComplete && (
              <p className="text-sm text-[var(--color-ink-500)]">
                See Supplements below to complete {dogName}&apos;s daily nutrition.
              </p>
            )}
          </div>
        </ExpandableSection>

        {/* Supplements & Additions */}
        {supplements.length > 0 && (
          <ExpandableSection title="Supplements & Additions" defaultOpen={true}>
            <div className="space-y-3 pt-2">
              {supplements.map((supp) => (
                <div
                  key={supp.name}
                  className="bg-[var(--color-oat)] border border-[var(--color-border)] rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="font-semibold text-[var(--color-ink)] text-sm">
                      {supp.name}
                    </h4>
                    <span className="text-xs font-medium text-[var(--color-coral)] shrink-0 bg-[var(--color-coral-muted)] rounded-full px-2 py-0.5">
                      {supp.daily_amount}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-ink-500)]">
                    <strong className="text-[var(--color-ink)]">
                      Why it matters:
                    </strong>{" "}
                    {supp.reason}
                  </p>
                  <p className="text-sm text-[var(--color-sage)] mt-1">
                    <strong>For {dogName}:</strong> supports complete daily nutrition
                  </p>
                </div>
              ))}
            </div>
          </ExpandableSection>
        )}

        {/* Ingredients & Method */}
        <ExpandableSection title="Ingredients & Method" defaultOpen={false}>
          <div className="pt-2">
            {/* Measure / batch toggles */}
            <div className="flex flex-wrap gap-3 mb-5 justify-between">
              <div className="flex gap-0.5 rounded-full bg-[var(--color-oat)] p-0.5">
                {(["grams", "cups"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setGramsMode(mode)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      gramsMode === mode
                        ? "bg-[var(--color-warm-white)] shadow-sm text-[var(--color-ink)]"
                        : "text-[var(--color-ink-500)]"
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
              <div className="flex gap-0.5 rounded-full bg-[var(--color-oat)] p-0.5">
                {[1, 3, 7].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setBatchDays(d)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      batchDays === d
                        ? "bg-[var(--color-warm-white)] shadow-sm text-[var(--color-ink)]"
                        : "text-[var(--color-ink-500)]"
                    }`}
                  >
                    ×{d}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Ingredients */}
              <div>
                <h4 className="text-xs font-semibold text-[var(--color-ink-500)] uppercase tracking-wider mb-3">
                  Ingredients
                </h4>
                <ul className="space-y-2">
                  {recipe.ingredients.map((ing) => {
                    const scaledGrams = ing.grams * batchDays;
                    const cupsNum = parseCups(ing.cups);
                    const scaledCups =
                      cupsNum !== null ? cupsNum * batchDays : null;
                    return (
                      <li
                        key={ing.name}
                        className="flex items-start gap-2 bg-[var(--color-oat)] rounded-lg px-3 py-2 text-sm"
                      >
                        <span className="text-[var(--color-coral)] mt-0.5 shrink-0">
                          •
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-[var(--color-ink)] font-medium">
                            {ing.name}
                          </span>
                          <span className="text-[var(--color-ink-500)] ml-2">
                            {gramsMode === "grams"
                              ? `${fmtQty(scaledGrams)}g`
                              : scaledCups !== null
                                ? `${fmtQty(scaledCups)} cups`
                                : ing.cups}
                          </span>
                          {ing.notes && (
                            <div className="text-xs text-[var(--color-ink-500)] mt-0.5">
                              {ing.notes}
                            </div>
                          )}
                          {ing.needs_purchasing && (
                            <a
                              href={`https://www.tesco.com/groceries/en-GB/search?query=${encodeURIComponent(ing.name)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 rounded-full bg-[var(--color-coral)] px-2 py-0.5 text-xs font-semibold text-[var(--color-warm-white)]"
                            >
                              Buy
                            </a>
                          )}
                          {ing.running_low && !ing.needs_purchasing && (
                            <span className="ml-2 text-xs font-medium text-amber-700">
                              Low
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Method */}
              <div>
                <h4 className="text-xs font-semibold text-[var(--color-ink-500)] uppercase tracking-wider mb-3">
                  Method
                </h4>
                <ol className="space-y-3">
                  {recipe.instructions.map((step, idx) => (
                    <li
                      key={`${recipe.id}-step-${idx}`}
                      className="flex gap-3 text-sm"
                    >
                      <span className="font-heading text-xl font-semibold text-[var(--color-coral)] opacity-40 min-w-[1.5rem] leading-none mt-0.5 shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-[var(--color-ink)] leading-relaxed">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </ExpandableSection>

        {/* Cost & Shopping */}
        <ExpandableSection title="Cost & Shopping" defaultOpen={false}>
          <div className="pt-2 space-y-4">
            {hasCostAccess ? (
              dailyCost !== undefined && dailyCost > 0 ? (
                <>
                  <div className="bg-[var(--color-butter-muted)] rounded-xl p-4">
                    <div className="text-xs text-[var(--color-ink-500)] uppercase tracking-wider mb-1">
                      Cost per Day
                    </div>
                    <div className="text-3xl font-semibold text-[var(--color-ink)]">
                      {currency}
                      {dailyCost.toFixed(2)}
                    </div>
                    {recipe.kibble_comparison && (
                      <div
                        className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
                          recipe.kibble_comparison.cheaper_than_kibble
                            ? "border-[var(--color-sage-light)] bg-[var(--color-sage-muted)]"
                            : "border-amber-200 bg-amber-50"
                        }`}
                      >
                        <p className="font-semibold text-[var(--color-ink)]">
                          {recipe.kibble_comparison.message_honest}
                        </p>
                        <p className="text-[var(--color-ink-500)] mt-1">
                          {recipe.kibble_comparison.message_reframe}
                        </p>
                        {recipe.kibble_comparison.baseline_source ===
                          "estimate" && (
                          <p className="mt-1 text-xs text-[var(--color-ink-300)]">
                            Based on typical kibble costs for your dog&apos;s
                            size.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {recipe.cost_breakdown && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setCostExpanded((v) => !v)}
                        className="text-xs font-semibold text-[var(--color-coral)] hover:underline"
                      >
                        {costExpanded ? "Hide" : "Show"} cost breakdown{" "}
                        {costExpanded ? "▲" : "▼"}
                      </button>
                      {costExpanded && (
                        <div className="mt-3 rounded-lg bg-[var(--color-oat)] p-3">
                          <div className="divide-y divide-[var(--color-border)]">
                            {recipe.cost_breakdown.map((item) => (
                              <div
                                key={item.name}
                                className="flex items-center justify-between py-2 text-xs"
                              >
                                <span className="text-[var(--color-ink)]">
                                  {item.matched_name !== item.name
                                    ? item.matched_name
                                    : item.name}{" "}
                                  ({item.grams}g)
                                  {item.is_estimated ? " ~" : ""}
                                </span>
                                <span className="font-medium text-[var(--color-ink)]">
                                  {item.cost !== null
                                    ? `${currency}${item.cost.toFixed(2)}`
                                    : "—"}
                                </span>
                              </div>
                            ))}
                          </div>
                          {recipe.has_unpriced_items && (
                            <p className="mt-2 text-xs italic text-[var(--color-ink-300)]">
                              * Some ingredients excluded from total.
                            </p>
                          )}
                          <p className="mt-2 text-xs text-[var(--color-ink-300)]">
                            Prices from {supermarket}
                            {syncDate ? ` · Updated ${syncDate}` : ""}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {recipe.competitor_comparisons &&
                    recipe.competitor_comparisons.length > 0 && (
                      <div>
                        <button
                          type="button"
                          onClick={() => setCompetitorExpanded((v) => !v)}
                          className="text-xs font-semibold text-[var(--color-coral)] hover:underline"
                        >
                          vs fresh food delivery{" "}
                          {competitorExpanded ? "▲" : "›"}
                        </button>
                        {competitorExpanded && (
                          <div className="mt-2 space-y-1.5">
                            {recipe.competitor_comparisons.map((comp) => (
                              <div
                                key={comp.brand}
                                className="flex items-center justify-between text-xs"
                              >
                                <span className="text-[var(--color-ink-500)]">
                                  approx. {comp.brand}: ~{currency}
                                  {comp.their_daily_cost.toFixed(2)}/day for a{" "}
                                  {comp.dog_weight_kg}kg dog
                                </span>
                                {comp.your_saving_daily > 0 && (
                                  <span className="font-semibold text-[var(--color-forest)]">
                                    save ~{currency}
                                    {comp.your_saving_monthly.toFixed(0)}/mo
                                  </span>
                                )}
                              </div>
                            ))}
                            <p className="mt-1 text-xs italic text-[var(--color-ink-300)]">
                              Competitor prices are publicly listed estimates
                              and may vary.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                </>
              ) : (
                <p className="text-sm text-[var(--color-ink-500)]">
                  Cost data not available for this recipe.
                </p>
              )
            ) : (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-oat)] p-6 text-center">
                <p className="text-sm font-semibold text-[var(--color-ink)] mb-1">
                  Cost per day
                </p>
                <p className="text-sm text-[var(--color-ink-500)] mb-4">
                  Upgrade to Pack to see costs, compare to fresh delivery, and
                  track your savings.
                </p>
                <button
                  type="button"
                  onClick={onCostUpgradeClick}
                  className="rounded-full bg-[var(--color-coral)] text-[var(--color-warm-white)] px-5 py-2 text-sm font-semibold hover:bg-[var(--color-coral-light)] transition-colors"
                >
                  Upgrade to Pack
                </button>
              </div>
            )}
          </div>
        </ExpandableSection>

        {/* Safety & Cautions */}
        <ExpandableSection title="Safety & Cautions" defaultOpen={false}>
          <div className="pt-2 space-y-3">
            {vetFlag && vetMessage && (
              <div className="bg-[var(--color-coral-muted)] border border-[var(--color-coral)] rounded-xl p-4 flex gap-3">
                <svg viewBox="0 0 20 20" className="w-5 h-5 text-[var(--color-coral)] shrink-0 mt-0.5" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-semibold text-[var(--color-ink)] text-sm">
                    Vet Consultation Recommended
                  </p>
                  <p className="text-sm text-[var(--color-ink)] mt-1">
                    {vetMessage}
                  </p>
                </div>
              </div>
            )}
            <div className="bg-[var(--color-sage-muted)] rounded-lg p-4">
              <p className="text-sm text-[var(--color-ink)]">
                <strong>Safety score:</strong> {safetyScore.toFixed(1)}/10
              </p>
              {recipe.safety_notes && (
                <p className="text-sm text-[var(--color-ink)] mt-2">
                  {recipe.safety_notes}
                </p>
              )}
            </div>
            <p className="text-xs text-[var(--color-ink-500)]">
              Recipup recipes are a guide, not medical advice. Always speak to
              your vet before making significant dietary changes, especially if
              your dog has a health condition.
            </p>
          </div>
        </ExpandableSection>
      </div>

      {/* Equipment warning */}
      {unavailableEquipment && (
        <div className="border-t border-[var(--color-border)] bg-amber-50 px-6 py-4">
          <p className="text-sm font-semibold text-amber-900">
            This recipe requires a {unavailableEquipment}
          </p>
          <a
            href={`https://www.amazon.co.uk/s?k=${encodeURIComponent(unavailableEquipment)}`}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="mt-1 inline-block text-sm font-semibold text-[var(--color-coral)] hover:underline"
          >
            Shop on Amazon UK →
          </a>
          <p className="mt-0.5 text-xs text-[var(--color-ink-300)]">
            Affiliate link — we may earn a small commission at no extra cost to
            you.
          </p>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex gap-3 p-6 border-t border-[var(--color-border)] no-print">
        <button
          type="button"
          onClick={onSave}
          className="flex-1 rounded-full bg-[var(--color-coral)] text-[var(--color-warm-white)] px-5 py-3 text-sm font-semibold hover:bg-[var(--color-coral-light)] transition-colors"
        >
          {isSaved ? "Saved ✓" : "Save Recipe"}
        </button>
        {onAddToPlan && (
          <button
            type="button"
            onClick={onAddToPlan}
            className="flex-1 rounded-full border border-[var(--color-border-strong)] text-[var(--color-ink)] px-5 py-3 text-sm font-semibold hover:bg-[var(--color-oat)] transition-colors"
          >
            Add to Plan
          </button>
        )}
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-full px-4 py-3 text-[var(--color-ink-500)] hover:text-[var(--color-ink)] transition-colors no-print"
          title="Print this recipe"
          aria-label="Print recipe"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 2h8v4H6V2zm-2 5h12a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-2v2H6v-2H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zm10 2.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1zM6 14h8v4H6v-4z" />
          </svg>
        </button>
      </div>
    </article>
  );
}
