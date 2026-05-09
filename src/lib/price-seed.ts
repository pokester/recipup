// Price seed data for ingredient_prices table.
// Run the generated SQL via the Supabase Dashboard → SQL Editor.
// Each record is idempotent via ON CONFLICT (name_normalized, market) DO UPDATE.

export type PriceSeedItem = {
  name: string;
  name_normalized: string;
  type: "protein" | "carb" | "vegetable" | "supplement" | "oil" | "other";
  market: "uk" | "nl";
  price_per_kg: number | null;
  price_per_unit: number | null;
  unit: "kg" | "unit" | "ml";
  supermarket: string;
  sync_frequency: "daily" | "biweekly" | "weekly";
};

// UK proteins — £/kg unless noted, synced daily
const UK_PROTEINS: PriceSeedItem[] = [
  { name: "Chicken Breast", name_normalized: "chicken breast", type: "protein", market: "uk", price_per_kg: 7.00, price_per_unit: null, unit: "kg", supermarket: "tesco", sync_frequency: "daily" },
  { name: "Chicken Thighs", name_normalized: "chicken thighs", type: "protein", market: "uk", price_per_kg: 4.50, price_per_unit: null, unit: "kg", supermarket: "tesco", sync_frequency: "daily" },
  { name: "Chicken Liver", name_normalized: "chicken liver", type: "protein", market: "uk", price_per_kg: 3.00, price_per_unit: null, unit: "kg", supermarket: "tesco", sync_frequency: "daily" },
  { name: "Beef Mince 90% Lean", name_normalized: "beef mince 90% lean", type: "protein", market: "uk", price_per_kg: 8.00, price_per_unit: null, unit: "kg", supermarket: "tesco", sync_frequency: "daily" },
  { name: "Turkey Mince", name_normalized: "turkey mince", type: "protein", market: "uk", price_per_kg: 6.50, price_per_unit: null, unit: "kg", supermarket: "tesco", sync_frequency: "daily" },
  { name: "Salmon Fillet", name_normalized: "salmon fillet", type: "protein", market: "uk", price_per_kg: 12.00, price_per_unit: null, unit: "kg", supermarket: "tesco", sync_frequency: "daily" },
  { name: "Sardines Canned", name_normalized: "sardines", type: "protein", market: "uk", price_per_kg: 2.50, price_per_unit: null, unit: "kg", supermarket: "tesco", sync_frequency: "daily" },
  { name: "Eggs", name_normalized: "eggs", type: "protein", market: "uk", price_per_kg: null, price_per_unit: 0.30, unit: "unit", supermarket: "tesco", sync_frequency: "daily" },
  { name: "Lamb Mince", name_normalized: "lamb mince", type: "protein", market: "uk", price_per_kg: 9.00, price_per_unit: null, unit: "kg", supermarket: "tesco", sync_frequency: "daily" },
  { name: "White Fish Fillet", name_normalized: "white fish fillet", type: "protein", market: "uk", price_per_kg: 8.00, price_per_unit: null, unit: "kg", supermarket: "tesco", sync_frequency: "daily" },
];

// UK carbs & veg — £/kg, synced biweekly
const UK_CARBS_VEG: PriceSeedItem[] = [
  { name: "Brown Rice", name_normalized: "brown rice", type: "carb", market: "uk", price_per_kg: 1.50, price_per_unit: null, unit: "kg", supermarket: "tesco", sync_frequency: "biweekly" },
  { name: "White Rice", name_normalized: "white rice", type: "carb", market: "uk", price_per_kg: 1.20, price_per_unit: null, unit: "kg", supermarket: "tesco", sync_frequency: "biweekly" },
  { name: "Sweet Potato", name_normalized: "sweet potato", type: "carb", market: "uk", price_per_kg: 1.80, price_per_unit: null, unit: "kg", supermarket: "tesco", sync_frequency: "biweekly" },
  { name: "Carrots", name_normalized: "carrots", type: "vegetable", market: "uk", price_per_kg: 0.80, price_per_unit: null, unit: "kg", supermarket: "tesco", sync_frequency: "biweekly" },
  { name: "Green Beans", name_normalized: "green beans", type: "vegetable", market: "uk", price_per_kg: 2.00, price_per_unit: null, unit: "kg", supermarket: "tesco", sync_frequency: "biweekly" },
  { name: "Broccoli", name_normalized: "broccoli", type: "vegetable", market: "uk", price_per_kg: 2.50, price_per_unit: null, unit: "kg", supermarket: "tesco", sync_frequency: "biweekly" },
  { name: "Spinach", name_normalized: "spinach", type: "vegetable", market: "uk", price_per_kg: 3.00, price_per_unit: null, unit: "kg", supermarket: "tesco", sync_frequency: "biweekly" },
  { name: "Pumpkin", name_normalized: "pumpkin", type: "vegetable", market: "uk", price_per_kg: 2.00, price_per_unit: null, unit: "kg", supermarket: "tesco", sync_frequency: "biweekly" },
  { name: "Lentils", name_normalized: "lentils", type: "carb", market: "uk", price_per_kg: 2.00, price_per_unit: null, unit: "kg", supermarket: "tesco", sync_frequency: "biweekly" },
  { name: "Oats", name_normalized: "oats", type: "carb", market: "uk", price_per_kg: 1.00, price_per_unit: null, unit: "kg", supermarket: "tesco", sync_frequency: "biweekly" },
  { name: "Butternut Squash", name_normalized: "butternut squash", type: "vegetable", market: "uk", price_per_kg: 1.50, price_per_unit: null, unit: "kg", supermarket: "tesco", sync_frequency: "biweekly" },
  { name: "Courgette", name_normalized: "courgette", type: "vegetable", market: "uk", price_per_kg: 2.00, price_per_unit: null, unit: "kg", supermarket: "tesco", sync_frequency: "biweekly" },
  { name: "Peas", name_normalized: "peas", type: "vegetable", market: "uk", price_per_kg: 1.80, price_per_unit: null, unit: "kg", supermarket: "tesco", sync_frequency: "biweekly" },
];

// UK supplements — biweekly sync
const UK_SUPPLEMENTS: PriceSeedItem[] = [
  // fish oil: £0.08/ml → price_per_unit per ml
  { name: "Fish Oil", name_normalized: "fish oil", type: "oil", market: "uk", price_per_kg: null, price_per_unit: 0.08, unit: "ml", supermarket: "tesco", sync_frequency: "biweekly" },
  // calcium carbonate: £0.02/g = £20/kg → store as price_per_kg
  { name: "Calcium Carbonate", name_normalized: "calcium carbonate", type: "supplement", market: "uk", price_per_kg: 20.00, price_per_unit: null, unit: "kg", supermarket: "tesco", sync_frequency: "biweekly" },
  { name: "Canine Multivitamin", name_normalized: "canine multivitamin", type: "supplement", market: "uk", price_per_kg: null, price_per_unit: 0.25, unit: "unit", supermarket: "tesco", sync_frequency: "biweekly" },
  { name: "Probiotics", name_normalized: "probiotics", type: "supplement", market: "uk", price_per_kg: null, price_per_unit: 0.30, unit: "unit", supermarket: "tesco", sync_frequency: "biweekly" },
  { name: "Vitamin E", name_normalized: "vitamin e", type: "supplement", market: "uk", price_per_kg: null, price_per_unit: 0.15, unit: "unit", supermarket: "tesco", sync_frequency: "biweekly" },
  { name: "Glucosamine", name_normalized: "glucosamine", type: "supplement", market: "uk", price_per_kg: null, price_per_unit: 0.20, unit: "unit", supermarket: "tesco", sync_frequency: "biweekly" },
];

// NL prices: apply 1.18× multiplier, same ingredient list, supermarket = 'ah' (Albert Heijn)
const NL_MULTIPLIER = 1.18;

function toNL(item: PriceSeedItem): PriceSeedItem {
  return {
    ...item,
    market: "nl",
    supermarket: "ah",
    price_per_kg: item.price_per_kg != null ? Math.round(item.price_per_kg * NL_MULTIPLIER * 100) / 100 : null,
    price_per_unit: item.price_per_unit != null ? Math.round(item.price_per_unit * NL_MULTIPLIER * 1000) / 1000 : null,
  };
}

export const PRICE_SEED: PriceSeedItem[] = [
  ...UK_PROTEINS,
  ...UK_CARBS_VEG,
  ...UK_SUPPLEMENTS,
  ...UK_PROTEINS.map(toNL),
  ...UK_CARBS_VEG.map(toNL),
  ...UK_SUPPLEMENTS.map(toNL),
];

// SQL to run in Supabase Dashboard → SQL Editor
// Generates idempotent upserts for all seed items.
export function generateSeedSQL(): string {
  const rows = PRICE_SEED.map((item) => {
    const priceKg = item.price_per_kg != null ? item.price_per_kg : "NULL";
    const priceUnit = item.price_per_unit != null ? item.price_per_unit : "NULL";
    return `('${item.name.replace(/'/g, "''")}','${item.name_normalized.replace(/'/g, "''")}','${item.type}','${item.market}',${priceKg},${priceUnit},'${item.unit}','${item.supermarket}','${item.sync_frequency}',true,now(),now())`;
  });

  return `INSERT INTO public.ingredient_prices
  (name, name_normalized, type, market, price_per_kg, price_per_unit, unit, supermarket, sync_frequency, is_available, last_updated, created_at)
VALUES
${rows.join(",\n")}
ON CONFLICT DO NOTHING;`;
}
