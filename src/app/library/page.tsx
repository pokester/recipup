import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LibraryClient } from "@/components/library/LibraryClient";

type SavedRecipeRow = {
  id: string;
  dog_id: string | null;
  recipe_data: {
    name?: string;
    tagline?: string;
    method?: string;
    prep_time_mins?: number;
    cook_time_mins?: number;
    serves_days?: number;
    ingredients?: Array<{ name: string; grams: number; cups?: string; notes?: string }>;
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
  is_favourite: boolean;
  saved_at: string;
  dogs: { name: string } | null;
};

export default async function LibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: saved } = await supabase
    .from("saved_recipes")
    .select("id, dog_id, recipe_data, is_favourite, saved_at, dogs(name)")
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false });

  const typedSaved = (saved ?? []) as unknown as SavedRecipeRow[];

  return (
    <div className="mx-auto max-w-4xl px-6">
      <div className="pt-12 pb-8">
        <h1 className="font-heading text-3xl text-[var(--color-ink)]">Your recipe library</h1>
        <p className="mt-2 text-base text-[var(--color-ink-500)]">
          Every recipe you&apos;ve saved, ready to cook again.
        </p>
      </div>

      <LibraryClient initialRecipes={typedSaved} />
    </div>
  );
}
