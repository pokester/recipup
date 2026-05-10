import type { SupabaseClient } from "@supabase/supabase-js";

export type PantryItemInput = {
  type: "ingredient" | "supplement" | "equipment";
  name: string;
  quantity?: number | null;
  unit?: string | null;
  is_available: boolean;
  is_running_low?: boolean;
};

export type PantryItem = PantryItemInput & {
  id?: string;
  user_id?: string;
  last_updated?: string;
  created_at?: string;
};

export type Pantry = {
  ingredients: PantryItem[];
  supplements: PantryItem[];
  equipment: PantryItem[];
  lastUpdated: string | null;
};

export async function getPantry(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<Pantry> {
  const { data } = await supabase
    .from("pantry_items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  const items = (data ?? []) as PantryItem[];

  const lastUpdated =
    items.length > 0
      ? items.reduce((latest, item) => {
          const t = item.last_updated ?? "";
          return t > latest ? t : latest;
        }, "")
      : null;

  return {
    ingredients: items.filter((i) => i.type === "ingredient"),
    supplements: items.filter((i) => i.type === "supplement"),
    equipment: items.filter((i) => i.type === "equipment"),
    lastUpdated: lastUpdated || null,
  };
}

export async function savePantryItems(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  items: PantryItemInput[],
): Promise<void> {
  if (items.length === 0) return;
  await supabase.from("pantry_items").upsert(
    items.map((item) => ({
      user_id: userId,
      type: item.type,
      name: item.name,
      quantity: item.quantity ?? null,
      unit: item.unit ?? null,
      is_available: item.is_available,
      is_running_low: item.is_running_low ?? false,
      last_updated: new Date().toISOString(),
    })),
    { onConflict: "user_id,name" },
  );
}

export function buildPantryPrompt(pantry: Pantry): string {
  const availableIngredients = pantry.ingredients.filter(
    (i) => i.is_available && !i.is_running_low,
  );
  const runningLow = [
    ...pantry.ingredients.filter((i) => i.is_available && i.is_running_low),
    ...pantry.supplements.filter((i) => i.is_available && i.is_running_low),
  ];
  const unavailableIngredients = pantry.ingredients.filter((i) => !i.is_available);
  const availableEquipment = pantry.equipment.filter((e) => e.is_available);
  const unavailableEquipment = pantry.equipment.filter((e) => !e.is_available);

  const methodMap: Record<string, string> = {
    "slow cooker": "slow_cooker",
    "large stock pot": "one_pot",
    "baking tray": "oven",
  };
  const availableMethods = availableEquipment
    .filter((e) => methodMap[e.name])
    .map((e) => methodMap[e.name]);

  let prompt = "PANTRY CONTEXT:\n";

  prompt += "Available ingredients (prioritise these):\n";
  if (availableIngredients.length > 0) {
    availableIngredients.forEach((i) => {
      if (i.quantity && i.unit) {
        prompt += `- ${i.name}: ${i.quantity} ${i.unit}\n`;
      } else {
        prompt += `- ${i.name}\n`;
      }
    });
  } else {
    prompt += "(none specified)\n";
  }

  if (runningLow.length > 0) {
    prompt += "\nRunning low (use sparingly):\n";
    runningLow.forEach((i) => {
      prompt += `- ${i.name}\n`;
    });
  }

  if (unavailableIngredients.length > 0) {
    prompt += `\nNot available: ${unavailableIngredients.map((i) => i.name).join(", ")}\n`;
  }

  prompt += "\nEQUIPMENT AVAILABLE: ";
  prompt +=
    availableEquipment.length > 0
      ? availableEquipment.map((e) => e.name).join(", ")
      : "(none)";

  prompt += "\nEQUIPMENT NOT AVAILABLE: ";
  prompt +=
    unavailableEquipment.length > 0
      ? unavailableEquipment.map((e) => e.name).join(", ")
      : "(none)";

  if (unavailableEquipment.length > 0) {
    const methodList =
      availableMethods.length > 0 ? availableMethods.join(", ") : "one_pot, oven";
    prompt += `\n→ Do not generate recipes requiring unavailable equipment. Prefer ${methodList} where possible.`;
  }

  prompt +=
    "\n\nSHOPPING LIST: flag any ingredient not in pantry as needs_purchasing: true in the recipe JSON. Flag any running-low ingredient as running_low: true.";

  return prompt;
}
