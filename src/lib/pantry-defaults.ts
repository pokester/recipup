export type DefaultIngredient = { name: string; unit: string };
export type DefaultEquipment = { name: string };

export const DEFAULT_INGREDIENTS: DefaultIngredient[] = [
  { name: "chicken breast", unit: "g" },
  { name: "beef mince", unit: "g" },
  { name: "turkey mince", unit: "g" },
  { name: "salmon fillet", unit: "g" },
  { name: "sardines canned", unit: "g" },
  { name: "eggs", unit: "count" },
  { name: "brown rice", unit: "g" },
  { name: "white rice", unit: "g" },
  { name: "sweet potato", unit: "g" },
  { name: "carrots", unit: "g" },
  { name: "green beans", unit: "g" },
  { name: "broccoli", unit: "g" },
  { name: "spinach", unit: "g" },
  { name: "pumpkin", unit: "g" },
  { name: "lentils", unit: "g" },
  { name: "oats", unit: "g" },
];

export const DEFAULT_SUPPLEMENTS: DefaultIngredient[] = [
  { name: "fish oil", unit: "ml" },
  { name: "calcium carbonate", unit: "g" },
  { name: "canine multivitamin", unit: "count" },
  { name: "probiotics", unit: "count" },
  { name: "vitamin E", unit: "count" },
  { name: "glucosamine", unit: "count" },
  { name: "taurine", unit: "mg" },
  { name: "kelp powder", unit: "g" },
];

export const DEFAULT_EQUIPMENT: DefaultEquipment[] = [
  { name: "slow cooker" },
  { name: "large stock pot" },
  { name: "food processor" },
  { name: "kitchen scales" },
  { name: "steamer basket" },
  { name: "baking tray" },
  { name: "airtight containers" },
  { name: "freezer bags" },
];

// Equipment that materially affects which recipes can be generated
export const RECIPE_AFFECTING_EQUIPMENT = ["slow cooker", "food processor", "steamer basket"];

// Maps recipe method → required equipment name
export const METHOD_TO_EQUIPMENT: Record<string, string> = {
  slow_cooker: "slow cooker",
  one_pot: "large stock pot",
  oven: "baking tray",
};
