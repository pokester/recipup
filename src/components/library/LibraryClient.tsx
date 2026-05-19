"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Ingredient = { name: string; grams: number; cups?: string; notes?: string };

type FullRecipeData = {
  name?: string;
  tagline?: string;
  method?: string;
  prep_time_mins?: number;
  cook_time_mins?: number;
  serves_days?: number;
  ingredients?: Ingredient[];
  instructions?: string[];
  nutrition_per_day?: {
    calories: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
    notes?: string;
  };
  safety_score?: number;
};

type SavedRecipeRow = {
  id: string;
  dog_id: string | null;
  recipe_data: FullRecipeData;
  is_favourite: boolean;
  saved_at: string;
  dogs: { name: string } | null;
};

function daysAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "today";
  if (diff === 1) return "yesterday";
  return `${diff} days ago`;
}

function toTitleCase(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

function methodLabel(method: string | undefined): string | null {
  if (method === "slow_cooker") return "Slow Cooker";
  if (method === "one_pot") return "One Pot";
  if (method === "oven") return "Oven";
  return null;
}

function safetyBadge(score: number | undefined) {
  if (!score) return null;
  if (score >= 85) return { label: "✓ Excellent", cls: "bg-[var(--color-forest-light)]/10 text-[var(--color-forest)] border-[var(--color-forest-light)]/30" };
  if (score >= 70) return { label: "✓ Good", cls: "bg-amber-50 text-amber-800 border-amber-200" };
  return null;
}

export function LibraryClient({ initialRecipes }: { initialRecipes: SavedRecipeRow[] }) {
  const [recipes, setRecipes] = useState<SavedRecipeRow[]>(initialRecipes);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleToggleFavourite = async (item: SavedRecipeRow) => {
    const newVal = !item.is_favourite;
    setRecipes((prev) => prev.map((r) => (r.id === item.id ? { ...r, is_favourite: newVal } : r)));
    const supabase = createClient();
    await supabase.from("saved_recipes").update({ is_favourite: newVal }).eq("id", item.id);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remove this recipe from your library?")) return;
    setDeletingId(id);
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    const supabase = createClient();
    await supabase.from("saved_recipes").delete().eq("id", id);
    setDeletingId(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (recipes.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="font-heading text-2xl text-[var(--color-ink)]">No saved recipes yet.</p>
        <p className="mt-3 text-[var(--color-ink-500)]">
          Generate a recipe plan for your dog and save the ones you want to cook again.
        </p>
        <a
          href="/onboard"
          className="mt-8 inline-block rounded-full bg-[var(--color-coral)] px-6 py-3 text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
        >
          Generate recipes →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-16">
      {recipes.map((item) => {
        const recipe = item.recipe_data;
        const label = methodLabel(recipe.method);
        const badge = safetyBadge(recipe.safety_score);
        const isExpanded = expandedId === item.id;
        const dogDisplayName = toTitleCase(item.dogs?.name);

        return (
          <div
            key={item.id}
            className="rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-lift)]"
          >
            {/* Card header */}
            <div className="flex items-start gap-4 p-6">
              <div className="min-w-0 flex-1">
                <p className="font-heading text-lg text-[var(--color-ink)]">
                  {recipe.name ?? "Untitled recipe"}
                </p>
                {recipe.tagline && (
                  <p className="mt-1 text-sm italic text-[var(--color-ink-500)]">{recipe.tagline}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {label && (
                    <span className="rounded-full border border-[var(--color-sand-deep)] bg-[var(--color-sand)] px-3 py-1 text-xs font-medium text-[var(--color-ink)]">
                      {label}
                    </span>
                  )}
                  {badge && (
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-[var(--color-ink-300)]">
                  {dogDisplayName ? `${dogDisplayName} · ` : ""}Saved {daysAgo(item.saved_at)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleToggleFavourite(item)}
                  title={item.is_favourite ? "Remove from favourites" : "Add to favourites"}
                  className={`text-xl transition-transform hover:scale-110 ${
                    item.is_favourite ? "text-[var(--color-coral)]" : "text-[var(--color-ink-100)]"
                  }`}
                  aria-label={item.is_favourite ? "Remove from favourites" : "Add to favourites"}
                >
                  {item.is_favourite ? "♥" : "♡"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  title="Remove from library"
                  className="text-[var(--color-ink-300)] transition-colors hover:text-[var(--color-ink)] disabled:opacity-40"
                  aria-label="Remove from library"
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3h2m-4 0h8M5 6h10l-.9 11H5.9L5 6zm3 3v5m4-5v5" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => toggleExpand(item.id)}
                  className="text-sm font-medium text-[var(--color-coral)] hover:underline"
                >
                  {isExpanded ? "Collapse ↑" : "View full recipe →"}
                </button>
              </div>
            </div>

            {/* Expanded recipe detail */}
            {isExpanded && (
              <div className="border-t border-[var(--color-sand-deep)] px-6 pb-6 pt-5">
                <div className="flex flex-wrap gap-3 text-xs text-[var(--color-ink-500)]">
                  {recipe.prep_time_mins != null && recipe.cook_time_mins != null && (
                    <span>{recipe.prep_time_mins + recipe.cook_time_mins} min total</span>
                  )}
                  {recipe.serves_days != null && (
                    <span>Serves {recipe.serves_days} day{recipe.serves_days !== 1 ? "s" : ""}</span>
                  )}
                </div>

                {recipe.ingredients && recipe.ingredients.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-500)]">
                      Ingredients
                    </p>
                    <div className="divide-y divide-[var(--color-sand-deep)]">
                      {recipe.ingredients.map((ing, i) => (
                        <div key={i} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
                          <span className="text-[var(--color-ink)]">{ing.name}</span>
                          <span className="shrink-0 font-medium text-[var(--color-coral)]">
                            {ing.grams}g{ing.cups ? <span className="ml-2 font-normal text-[var(--color-ink-500)]">{ing.cups}</span> : null}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {recipe.instructions && recipe.instructions.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-500)]">
                      Instructions
                    </p>
                    <ol className="space-y-3">
                      {recipe.instructions.map((step, i) => (
                        <li key={i} className="flex gap-4">
                          <span className="mt-0.5 min-w-[2rem] font-heading text-2xl font-semibold leading-none text-[var(--color-coral)]/30">
                            {i + 1}
                          </span>
                          <span className="text-sm leading-relaxed text-[var(--color-ink)]">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {recipe.nutrition_per_day && (
                  <div className="mt-5 rounded-xl bg-[var(--color-sand)] px-4 py-3">
                    <p className="text-sm font-medium text-[var(--color-ink)]">
                      Per day — {recipe.nutrition_per_day.calories} kcal · {recipe.nutrition_per_day.protein_g}g protein ·{" "}
                      {recipe.nutrition_per_day.fat_g}g fat · {recipe.nutrition_per_day.carbs_g}g carbs
                    </p>
                    {recipe.nutrition_per_day.notes && (
                      <p className="mt-1 text-xs text-[var(--color-ink-500)]">{recipe.nutrition_per_day.notes}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
