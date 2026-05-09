"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { getPantry, savePantryItems, type PantryItemInput } from "@/lib/pantry";
import {
  DEFAULT_INGREDIENTS,
  DEFAULT_SUPPLEMENTS,
  DEFAULT_EQUIPMENT,
  RECIPE_AFFECTING_EQUIPMENT,
} from "@/lib/pantry-defaults";

type IngredientRow = {
  name: string;
  unit: string;
  isAvailable: boolean;
  quantity: string;
  isRunningLow: boolean;
};

type EquipmentRow = {
  name: string;
  isAvailable: boolean;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

export default function PantryPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>(() =>
    DEFAULT_INGREDIENTS.map((i) => ({ name: i.name, unit: i.unit, isAvailable: false, quantity: "", isRunningLow: false })),
  );
  const [supplementRows, setSupplementRows] = useState<IngredientRow[]>(() =>
    DEFAULT_SUPPLEMENTS.map((i) => ({ name: i.name, unit: i.unit, isAvailable: false, quantity: "", isRunningLow: false })),
  );
  const [equipmentRows, setEquipmentRows] = useState<EquipmentRow[]>(() =>
    DEFAULT_EQUIPMENT.map((e) => ({ name: e.name, isAvailable: false })),
  );
  const [customIngredients, setCustomIngredients] = useState<IngredientRow[]>([]);
  const [customSupplements, setCustomSupplements] = useState<IngredientRow[]>([]);
  const [openSections, setOpenSections] = useState({ ingredients: true, supplements: false, equipment: false });

  // Auth check + initial data load
  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setUserId(user.id);

      const pantry = await getPantry(supabase, user.id);

      const defaultIngNames = new Set(DEFAULT_INGREDIENTS.map((i) => i.name));
      const defaultSupNames = new Set(DEFAULT_SUPPLEMENTS.map((i) => i.name));

      // Merge DB ingredients with defaults
      const ingMap = new Map(pantry.ingredients.map((i) => [i.name, i]));
      setIngredientRows(
        DEFAULT_INGREDIENTS.map((d) => {
          const db = ingMap.get(d.name);
          return {
            name: d.name,
            unit: d.unit,
            isAvailable: db?.is_available ?? false,
            quantity: db?.quantity != null ? String(db.quantity) : "",
            isRunningLow: db?.is_running_low ?? false,
          };
        }),
      );
      const customIng = pantry.ingredients
        .filter((i) => !defaultIngNames.has(i.name))
        .map((i) => ({
          name: i.name,
          unit: i.unit ?? "",
          isAvailable: i.is_available,
          quantity: i.quantity != null ? String(i.quantity) : "",
          isRunningLow: i.is_running_low ?? false,
        }));
      setCustomIngredients(customIng);

      // Merge DB supplements with defaults
      const supMap = new Map(pantry.supplements.map((i) => [i.name, i]));
      setSupplementRows(
        DEFAULT_SUPPLEMENTS.map((d) => {
          const db = supMap.get(d.name);
          return {
            name: d.name,
            unit: d.unit,
            isAvailable: db?.is_available ?? false,
            quantity: db?.quantity != null ? String(db.quantity) : "",
            isRunningLow: db?.is_running_low ?? false,
          };
        }),
      );
      const customSup = pantry.supplements
        .filter((i) => !defaultSupNames.has(i.name))
        .map((i) => ({
          name: i.name,
          unit: i.unit ?? "",
          isAvailable: i.is_available,
          quantity: i.quantity != null ? String(i.quantity) : "",
          isRunningLow: i.is_running_low ?? false,
        }));
      setCustomSupplements(customSup);

      // Merge DB equipment with defaults
      const eqMap = new Map(pantry.equipment.map((e) => [e.name, e]));
      setEquipmentRows(
        DEFAULT_EQUIPMENT.map((d) => {
          const db = eqMap.get(d.name);
          return { name: d.name, isAvailable: db?.is_available ?? false };
        }),
      );

      if (pantry.lastUpdated) setLastSaved(pantry.lastUpdated);
      setLoaded(true);
    };
    void init();
  }, [router]);

  // Auto-save (debounced 1s)
  const triggerSave = useCallback(async (uid: string, rows: {
    ing: IngredientRow[];
    sup: IngredientRow[];
    eq: EquipmentRow[];
    customIng: IngredientRow[];
    customSup: IngredientRow[];
  }) => {
    setSaveState("saving");
    const items: PantryItemInput[] = [
      ...rows.ing.map((r) => ({
        type: "ingredient" as const,
        name: r.name,
        quantity: r.quantity ? parseFloat(r.quantity) : null,
        unit: r.unit || null,
        is_available: r.isAvailable,
        is_running_low: r.isRunningLow,
      })),
      ...rows.customIng.filter((r) => r.name.trim()).map((r) => ({
        type: "ingredient" as const,
        name: r.name.trim(),
        quantity: r.quantity ? parseFloat(r.quantity) : null,
        unit: r.unit || null,
        is_available: r.isAvailable,
        is_running_low: r.isRunningLow,
      })),
      ...rows.sup.map((r) => ({
        type: "supplement" as const,
        name: r.name,
        quantity: r.quantity ? parseFloat(r.quantity) : null,
        unit: r.unit || null,
        is_available: r.isAvailable,
        is_running_low: r.isRunningLow,
      })),
      ...rows.customSup.filter((r) => r.name.trim()).map((r) => ({
        type: "supplement" as const,
        name: r.name.trim(),
        quantity: r.quantity ? parseFloat(r.quantity) : null,
        unit: r.unit || null,
        is_available: r.isAvailable,
        is_running_low: r.isRunningLow,
      })),
      ...rows.eq.map((r) => ({
        type: "equipment" as const,
        name: r.name,
        is_available: r.isAvailable,
      })),
    ];
    try {
      const supabase = createClient();
      await savePantryItems(supabase, uid, items);
      const now = new Date().toISOString();
      setLastSaved(now);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch {
      setSaveState("idle");
    }
  }, []);

  const scheduleAutoSave = useCallback((
    ing: IngredientRow[],
    sup: IngredientRow[],
    eq: EquipmentRow[],
    customIng: IngredientRow[],
    customSup: IngredientRow[],
  ) => {
    if (!userId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void triggerSave(userId, { ing, sup, eq, customIng, customSup });
    }, 1000);
  }, [userId, triggerSave]);

  // Schedule auto-save whenever any row changes (skip initial load)
  useEffect(() => {
    if (!loaded) return;
    scheduleAutoSave(ingredientRows, supplementRows, equipmentRows, customIngredients, customSupplements);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingredientRows, supplementRows, equipmentRows, customIngredients, customSupplements, loaded]);

  const updateIngredient = (idx: number, isCustom: boolean, updated: IngredientRow) => {
    if (isCustom) setCustomIngredients((prev) => prev.map((r, i) => (i === idx ? updated : r)));
    else setIngredientRows((prev) => prev.map((r, i) => (i === idx ? updated : r)));
  };

  const updateSupplement = (idx: number, isCustom: boolean, updated: IngredientRow) => {
    if (isCustom) setCustomSupplements((prev) => prev.map((r, i) => (i === idx ? updated : r)));
    else setSupplementRows((prev) => prev.map((r, i) => (i === idx ? updated : r)));
  };

  const updateEquipment = (idx: number, updated: EquipmentRow) => {
    setEquipmentRows((prev) => prev.map((r, i) => (i === idx ? updated : r)));
  };

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const addCustomIngredient = () => {
    setCustomIngredients((prev) => [...prev, { name: "", unit: "g", isAvailable: true, quantity: "", isRunningLow: false }]);
  };

  const addCustomSupplement = () => {
    setCustomSupplements((prev) => [...prev, { name: "", unit: "g", isAvailable: true, quantity: "", isRunningLow: false }]);
  };

  if (!loaded) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-[var(--color-ink-soft)]">Loading your kitchen...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 md:px-10 md:py-14">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl text-[var(--color-ink)]">Your kitchen</h1>
          <p className="mt-2 text-[var(--color-ink-soft)]">
            Keep this up to date and every recipe we build will use what you already have — so your shopping list only shows what you actually need.
          </p>
          {lastSaved && (
            <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
              Last saved {timeAgo(lastSaved)}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {saveState === "saving" && (
            <span className="text-sm text-[var(--color-ink-soft)]">Saving...</span>
          )}
          {saveState === "saved" && (
            <span className="text-sm font-semibold text-green-700">Saved ✓</span>
          )}
          <Link
            href="/dashboard"
            className="rounded-full border border-[var(--color-border-strong)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
          >
            Dashboard
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        <CollapsibleSection
          title="Ingredients you have 🥩"
          open={openSections.ingredients}
          onToggle={() => toggleSection("ingredients")}
        >
          <div className="space-y-3">
            {ingredientRows.map((row, i) => (
              <IngredientRowUI
                key={row.name}
                row={row}
                onUpdate={(updated) => updateIngredient(i, false, updated)}
              />
            ))}
            {customIngredients.map((row, i) => (
              <IngredientRowUI
                key={`custom-ing-${i}`}
                row={row}
                isCustom
                onUpdate={(updated) => updateIngredient(i, true, updated)}
              />
            ))}
            <button
              type="button"
              onClick={addCustomIngredient}
              className="mt-1 text-sm text-[var(--color-accent)] hover:underline"
            >
              + Add ingredient
            </button>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Supplements 💊"
          open={openSections.supplements}
          onToggle={() => toggleSection("supplements")}
        >
          <div className="space-y-3">
            {supplementRows.map((row, i) => (
              <IngredientRowUI
                key={row.name}
                row={row}
                onUpdate={(updated) => updateSupplement(i, false, updated)}
              />
            ))}
            {customSupplements.map((row, i) => (
              <IngredientRowUI
                key={`custom-sup-${i}`}
                row={row}
                isCustom
                onUpdate={(updated) => updateSupplement(i, true, updated)}
              />
            ))}
            <button
              type="button"
              onClick={addCustomSupplement}
              className="mt-1 text-sm text-[var(--color-accent)] hover:underline"
            >
              + Add supplement
            </button>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Kitchen equipment 🍲"
          open={openSections.equipment}
          onToggle={() => toggleSection("equipment")}
        >
          <div className="space-y-3">
            {equipmentRows.map((row, i) => (
              <EquipmentRowUI
                key={row.name}
                row={row}
                onUpdate={(updated) => updateEquipment(i, updated)}
              />
            ))}
          </div>
        </CollapsibleSection>
      </div>

      <div className="mt-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] px-5 py-4">
        <p className="text-sm text-[var(--color-ink-soft)]">
          Missing equipment is never shown as a required purchase — only suggested if a recipe would genuinely benefit from it.
        </p>
      </div>
    </div>
  );
}

function CollapsibleSection({
  title, open, onToggle, children,
}: { title: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="font-semibold text-[var(--color-ink)]">{title}</span>
        <span className="text-xs text-[var(--color-ink-soft)]">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="border-t border-[var(--color-border)] px-5 pb-5 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

function IngredientRowUI({
  row, isCustom = false, onUpdate,
}: { row: IngredientRow; isCustom?: boolean; onUpdate: (updated: IngredientRow) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {isCustom ? (
        <input
          type="text"
          value={row.name}
          placeholder="Ingredient name"
          onChange={(e) => onUpdate({ ...row, name: e.target.value })}
          className="h-8 w-36 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-cream-soft)] px-2 text-sm outline-none focus:border-[var(--color-accent)]"
        />
      ) : (
        <span className="w-36 flex-shrink-0 text-sm capitalize text-[var(--color-ink)]">{row.name}</span>
      )}

      {row.isAvailable && (
        <>
          <input
            type="number"
            min={0}
            value={row.quantity}
            onChange={(e) => onUpdate({ ...row, quantity: e.target.value })}
            placeholder="qty"
            className="h-8 w-20 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-cream-soft)] px-2 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <span className="text-xs text-[var(--color-ink-soft)]">{row.unit}</span>
          <label className="flex items-center gap-1.5 text-xs text-[var(--color-ink-soft)]">
            <input
              type="checkbox"
              checked={row.isRunningLow}
              onChange={(e) => onUpdate({ ...row, isRunningLow: e.target.checked })}
              className="accent-[var(--color-accent)]"
            />
            Running low
          </label>
        </>
      )}

      <div className="ml-auto inline-flex rounded-full border border-[var(--color-border-strong)] bg-[var(--color-cream-soft)] p-0.5 text-xs">
        <button
          type="button"
          onClick={() => onUpdate({ ...row, isAvailable: true })}
          className={`rounded-full px-3 py-1 transition-colors ${row.isAvailable ? "bg-[var(--color-accent)] text-[var(--color-cream)]" : "text-[var(--color-ink-soft)]"}`}
        >
          Have it
        </button>
        <button
          type="button"
          onClick={() => onUpdate({ ...row, isAvailable: false })}
          className={`rounded-full px-3 py-1 transition-colors ${!row.isAvailable ? "bg-[var(--color-border-strong)] text-[var(--color-ink)]" : "text-[var(--color-ink-soft)]"}`}
        >
          Don&apos;t have
        </button>
      </div>
    </div>
  );
}

function EquipmentRowUI({
  row, onUpdate,
}: { row: EquipmentRow; onUpdate: (updated: EquipmentRow) => void }) {
  const affectsRecipes = RECIPE_AFFECTING_EQUIPMENT.includes(row.name);
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm capitalize text-[var(--color-ink)]">{row.name}</span>
        <div className="inline-flex rounded-full border border-[var(--color-border-strong)] bg-[var(--color-cream-soft)] p-0.5 text-xs">
          <button
            type="button"
            onClick={() => onUpdate({ ...row, isAvailable: true })}
            className={`rounded-full px-3 py-1 transition-colors ${row.isAvailable ? "bg-[var(--color-accent)] text-[var(--color-cream)]" : "text-[var(--color-ink-soft)]"}`}
          >
            Have it
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ ...row, isAvailable: false })}
            className={`rounded-full px-3 py-1 transition-colors ${!row.isAvailable ? "bg-[var(--color-border-strong)] text-[var(--color-ink)]" : "text-[var(--color-ink-soft)]"}`}
          >
            Don&apos;t have
          </button>
        </div>
      </div>
      {!row.isAvailable && affectsRecipes && (
        <p className="mt-1 text-xs italic text-[var(--color-accent)]">
          We&apos;ll only suggest recipes you can actually make with your current equipment.
        </p>
      )}
    </div>
  );
}
