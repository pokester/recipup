import { createClient } from "@/lib/supabase/server";

// ─── Public types ─────────────────────────────────────────────────────────────

export type PriceMatch = {
  cost: number | null;
  matched_name: string;
  product_url: string | null;
  is_estimated: boolean;
  is_available: boolean;
};

export type IngredientCost = {
  name: string;
  grams: number;
  cost: number | null;
  matched_name: string;
  is_estimated: boolean;
};

export type RecipeCost = {
  cost_per_day: number;
  cost_per_batch: number;
  cost_breakdown: IngredientCost[];
  has_unpriced_items: boolean;
  unpriced_items: string[];
  price_sync_date: string | null;
};

export type KibbleComparison = {
  daily_saving_vs_kibble: number;
  monthly_saving_vs_kibble: number;
  cheaper_than_kibble: boolean;
  vs_butternut_box_daily: number;
  vs_tails_daily: number;
  baseline_source: "user_entered" | "estimate";
  message_honest: string;
  message_reframe: string;
};

export type CompetitorComparison = {
  brand: string;
  their_daily_cost: number;
  your_saving_daily: number;
  your_saving_monthly: number;
  dog_weight_kg: number;
};

// ─── Normalisation ────────────────────────────────────────────────────────────

const STRIP_WORDS = [
  "boneless", "skinless", "diced", "fresh", "raw", "cooked", "canned",
  "tinned", "dried", "minced", "ground", "frozen", "organic", "free-range",
  "lean", "extra", "chopped", "sliced", "peeled", "washed", "rinsed",
  "boiled", "steamed", "baked", "roasted", "deboned", "de-boned", "finely",
  "roughly", "baby", "thawed", "wild-caught", "wild", "caught", "plain",
  "unsalted", "unsweetened", "pureed", "mashed", "coarse",
];

const ALIASES: Record<string, string> = {
  sardine: "sardines",
  "sardines canned": "sardines",
  "canned sardines": "sardines",
  "tinned sardines": "sardines",
  "chicken breast fillet": "chicken breast",
  "chicken breast fillets": "chicken breast",
  "chicken thigh": "chicken thighs",
  "chicken thigh fillets": "chicken thighs",
  "ground beef": "beef mince 90% lean",
  "minced beef": "beef mince 90% lean",
  "beef mince": "beef mince 90% lean",
  "90% beef mince": "beef mince 90% lean",
  "minced turkey": "turkey mince",
  salmon: "salmon fillet",
  egg: "eggs",
  "sweet potatoes": "sweet potato",
  carrot: "carrots",
  "green bean": "green beans",
  zucchini: "courgette",
  pea: "peas",
  lentil: "lentils",
  oat: "oats",
  "rolled oats": "oats",
  "porridge oats": "oats",
  "fish oil": "fish oil",
  "omega-3 fish oil": "fish oil",
  "omega 3 fish oil": "fish oil",
  "salmon oil": "fish oil",
  "cod liver oil": "fish oil",
  calcium: "calcium carbonate",
  "calcium powder": "calcium carbonate",
  "vitamin e": "vitamin e",
  "vitamin e supplement": "vitamin e",
  multivitamin: "canine multivitamin",
  "dog multivitamin": "canine multivitamin",
  probiotic: "probiotics",
  "probiotic supplement": "probiotics",
  "glucosamine supplement": "glucosamine",
  "white fish": "white fish fillet",
  cod: "white fish fillet",
  haddock: "white fish fillet",
  tilapia: "white fish fillet",
  pollock: "white fish fillet",
  lamb: "lamb mince",
  "minced lamb": "lamb mince",
  "ground lamb": "lamb mince",
  "pumpkin puree": "pumpkin",
  butternut: "butternut squash",
};

export function normalizeIngredientName(name: string): string {
  let n = name.toLowerCase().trim();
  // Remove parenthetical content
  n = n.replace(/\([^)]*\)/g, " ").trim();
  // Remove "in water", "in brine" etc.
  n = n.replace(/\bin\s+\w+\b/g, "").trim();
  // Strip adjectives word-by-word
  for (const word of STRIP_WORDS) {
    n = n.replace(new RegExp(`\\b${word}\\b`, "g"), " ").trim();
  }
  n = n.replace(/\s+/g, " ").trim();
  return ALIASES[n] ?? n;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

type PriceRow = {
  name: string;
  name_normalized: string;
  unit: string;
  price_per_kg: number | null;
  price_per_unit: number | null;
  product_url: string | null;
  is_available: boolean;
  last_updated: string;
};

function computeCost(grams: number, row: PriceRow): number | null {
  if (!row.is_available) return null;
  const { unit, price_per_kg, price_per_unit, name_normalized } = row;
  if ((unit === "kg" || unit === "g") && price_per_kg != null) {
    return (grams / 1000) * price_per_kg;
  }
  if (unit === "ml" && price_per_unit != null) {
    return grams * price_per_unit; // grams ≈ ml for oils
  }
  if (unit === "unit" && price_per_unit != null) {
    if (name_normalized === "eggs") {
      return Math.max(1, Math.round(grams / 58)) * price_per_unit;
    }
    return price_per_unit; // 1 unit per serving for supplements
  }
  return null;
}

function bestRowMatch(normalized: string, rows: PriceRow[]): { row: PriceRow; estimated: boolean } | null {
  const exact = rows.find((r) => r.name_normalized === normalized);
  if (exact) return { row: exact, estimated: false };

  const sub = rows.find(
    (r) => r.name_normalized.includes(normalized) || normalized.includes(r.name_normalized),
  );
  if (sub) return { row: sub, estimated: true };

  let best: PriceRow | null = null;
  let bestDist = Infinity;
  for (const row of rows) {
    const d = levenshtein(normalized, row.name_normalized);
    if (d < bestDist && d <= 3) {
      bestDist = d;
      best = row;
    }
  }
  return best ? { row: best, estimated: true } : null;
}

// ─── Public functions ─────────────────────────────────────────────────────────

export async function matchIngredientPrice(
  ingredientName: string,
  grams: number,
  market: "uk" | "nl",
): Promise<PriceMatch> {
  const normalized = normalizeIngredientName(ingredientName);
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("ingredient_prices")
      .select("name, name_normalized, unit, price_per_kg, price_per_unit, product_url, is_available, last_updated")
      .eq("market", market)
      .eq("is_available", true);

    const rows = (data ?? []) as PriceRow[];
    const match = bestRowMatch(normalized, rows);
    if (!match) {
      void searchAndAddIngredient(normalized, market);
      return { cost: null, matched_name: ingredientName, product_url: null, is_estimated: true, is_available: false };
    }
    return {
      cost: computeCost(grams, match.row),
      matched_name: match.row.name,
      product_url: match.row.product_url,
      is_estimated: match.estimated,
      is_available: match.row.is_available,
    };
  } catch {
    return { cost: null, matched_name: ingredientName, product_url: null, is_estimated: true, is_available: false };
  }
}

export async function searchAndAddIngredient(name: string, market: "uk" | "nl"): Promise<void> {
  const searchUrl =
    market === "uk"
      ? `https://www.tesco.com/groceries/en-GB/search?query=${encodeURIComponent(name)}`
      : `https://www.ah.nl/zoeken?query=${encodeURIComponent(name)}`;

  if (process.env.NODE_ENV === "development") {
    console.log(`[price-lookup] Missing: "${name}" (${market}) → ${searchUrl}`);
  }

  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceKey || !supabaseUrl) return;

    await fetch(`${supabaseUrl}/rest/v1/ingredient_prices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: "resolution=ignore-duplicates",
      },
      body: JSON.stringify({
        name,
        name_normalized: name,
        type: "other",
        market,
        is_available: false,
        needs_price_lookup: true,
        product_url: searchUrl,
      }),
    });
  } catch {
    // Non-critical
  }
}

export async function calculateRecipeCost(
  recipe: { ingredients: Array<{ name: string; grams: number }>; serves_days?: number },
  market: "uk" | "nl",
  servingDays: number,
): Promise<RecipeCost> {
  const breakdown: IngredientCost[] = [];
  const unpricedItems: string[] = [];
  let totalBatchCost = 0;
  let latestSyncDate: string | null = null;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("ingredient_prices")
      .select("name, name_normalized, unit, price_per_kg, price_per_unit, product_url, is_available, last_updated")
      .eq("market", market)
      .eq("is_available", true);

    const rows = (data ?? []) as PriceRow[];

    for (const ing of recipe.ingredients) {
      const normalized = normalizeIngredientName(ing.name);
      const match = bestRowMatch(normalized, rows);

      if (match) {
        const cost = computeCost(ing.grams, match.row);
        breakdown.push({ name: ing.name, grams: ing.grams, cost, matched_name: match.row.name, is_estimated: match.estimated });
        if (cost !== null) totalBatchCost += cost;
        const ts = match.row.last_updated?.split("T")[0] ?? null;
        if (ts && (!latestSyncDate || ts > latestSyncDate)) latestSyncDate = ts;
      } else {
        breakdown.push({ name: ing.name, grams: ing.grams, cost: null, matched_name: ing.name, is_estimated: true });
        unpricedItems.push(ing.name);
        void searchAndAddIngredient(normalized, market);
      }
    }
  } catch {
    return {
      cost_per_day: 0,
      cost_per_batch: 0,
      cost_breakdown: recipe.ingredients.map((i) => ({
        name: i.name, grams: i.grams, cost: null, matched_name: i.name, is_estimated: true,
      })),
      has_unpriced_items: true,
      unpriced_items: recipe.ingredients.map((i) => i.name),
      price_sync_date: null,
    };
  }

  const days = servingDays > 0 ? servingDays : 1;
  const costPerDay = totalBatchCost / days;

  void cacheCost(recipe.ingredients, market, costPerDay, totalBatchCost, breakdown, latestSyncDate);

  return {
    cost_per_day: Math.round(costPerDay * 100) / 100,
    cost_per_batch: Math.round(totalBatchCost * 100) / 100,
    cost_breakdown: breakdown,
    has_unpriced_items: unpricedItems.length > 0,
    unpriced_items: unpricedItems,
    price_sync_date: latestSyncDate,
  };
}

async function cacheCost(
  ingredients: Array<{ name: string; grams: number }>,
  market: "uk" | "nl",
  costPerDay: number,
  costPerBatch: number,
  breakdown: IngredientCost[],
  syncDate: string | null,
): Promise<void> {
  try {
    const hash = simpleHash(
      ingredients
        .map((i) => `${i.name}:${i.grams}`)
        .sort()
        .join("|"),
    );
    const supabase = await createClient();
    await supabase.from("recipe_costs").upsert(
      {
        recipe_hash: hash,
        market,
        cost_per_day_gbp: market === "uk" ? Math.round(costPerDay * 100) / 100 : null,
        cost_per_day_eur: market === "nl" ? Math.round(costPerDay * 100) / 100 : null,
        cost_breakdown: breakdown as unknown as Record<string, unknown>[],
        calculated_at: new Date().toISOString(),
        price_sync_date: syncDate,
        // suppress unused variable warning
        ...(costPerBatch !== undefined ? {} : {}),
      },
      { onConflict: "recipe_hash,market" },
    );
  } catch {
    // Non-critical
  }
}

// ─── Kibble + competitor comparison ───────────────────────────────────────────

const KIBBLE_REF_UK: Array<{ maxKg: number; monthly: number }> = [
  { maxKg: 10, monthly: 25 },
  { maxKg: 20, monthly: 35 },
  { maxKg: 30, monthly: 45 },
  { maxKg: 40, monthly: 55 },
  { maxKg: Infinity, monthly: 70 },
];
const EUR = 1.18;

type CompetitorDef = {
  brand: string;
  baseGbp: number | null;
  baseEur: number;
  refKg: number;
  markets: ("uk" | "nl")[];
};

const COMPETITORS: CompetitorDef[] = [
  { brand: "Butternut Box", baseGbp: 3.20, baseEur: 3.78, refKg: 28, markets: ["uk", "nl"] },
  { brand: "Tails.com", baseGbp: 2.00, baseEur: 2.36, refKg: 28, markets: ["uk", "nl"] },
  { brand: "Frisp", baseGbp: null, baseEur: 3.05, refKg: 28, markets: ["nl"] },
];

function scaleWeight(base: number, weightKg: number, ref = 28): number {
  return base * Math.pow(weightKg / ref, 0.75);
}

export function compareToKibble(
  daily_cost: number,
  kibble_monthly_spend: number | null,
  dog_weight_kg: number,
  market: "uk" | "nl",
): KibbleComparison {
  let baseMonthly: number;
  let baseline_source: "user_entered" | "estimate";

  if (kibble_monthly_spend && kibble_monthly_spend > 0) {
    baseMonthly = kibble_monthly_spend;
    baseline_source = "user_entered";
  } else {
    const tier = KIBBLE_REF_UK.find((t) => dog_weight_kg <= t.maxKg);
    baseMonthly = (tier?.monthly ?? 70) * (market === "nl" ? EUR : 1);
    baseline_source = "estimate";
  }

  const baseDaily = baseMonthly / 30.4;
  const dailySaving = Math.round((baseDaily - daily_cost) * 100) / 100;
  const monthlySaving = Math.round((baseMonthly - daily_cost * 30.4) * 100) / 100;
  const cheaper = dailySaving > 0;
  const cur = market === "nl" ? "€" : "£";
  const label = baseline_source === "user_entered" ? "your current food" : "typical kibble for your dog's size";

  const bbBase = market === "nl" ? 3.78 : 3.20;
  const tailsBase = market === "nl" ? 2.36 : 2.00;
  const bbDaily = Math.round(scaleWeight(bbBase, dog_weight_kg, 28) * 100) / 100;
  const tailsDaily = Math.round(scaleWeight(tailsBase, dog_weight_kg, 28) * 100) / 100;

  return {
    daily_saving_vs_kibble: dailySaving,
    monthly_saving_vs_kibble: monthlySaving,
    cheaper_than_kibble: cheaper,
    vs_butternut_box_daily: bbDaily,
    vs_tails_daily: tailsDaily,
    baseline_source,
    message_honest: cheaper
      ? `${cur}${Math.abs(dailySaving).toFixed(2)}/day cheaper than ${label}`
      : `${cur}${Math.abs(dailySaving).toFixed(2)}/day more than ${label}`,
    message_reframe: cheaper
      ? `Saves ~${cur}${Math.abs(monthlySaving).toFixed(2)}/month — fresh, tailored ingredients your dog will love.`
      : `But no fillers, no preservatives — real ingredients your dog will actually enjoy.`,
  };
}

export function compareToCompetitors(
  daily_cost: number,
  dog_weight_kg: number,
  market: "uk" | "nl" = "uk",
): CompetitorComparison[] {
  return COMPETITORS
    .filter((c) => c.markets.includes(market))
    .flatMap((c) => {
      const basePrice = market === "nl" ? c.baseEur : c.baseGbp;
      if (basePrice === null) return [];
      const theirDaily = Math.round(scaleWeight(basePrice, dog_weight_kg, c.refKg) * 100) / 100;
      const savingDaily = Math.round((theirDaily - daily_cost) * 100) / 100;
      const savingMonthly = Math.round(savingDaily * 30.4 * 100) / 100;
      return [{ brand: c.brand, their_daily_cost: theirDaily, your_saving_daily: savingDaily, your_saving_monthly: savingMonthly, dog_weight_kg }];
    });
}
