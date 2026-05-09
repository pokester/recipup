import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type SavedRecipeRow = {
  id: string;
  dog_id: string | null;
  recipe_data: {
    name?: string;
    tagline?: string;
    method?: string;
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
    <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
      <div className="mb-8">
        <h1 className="font-heading text-4xl text-[var(--color-ink)]">Your recipe library</h1>
        <p className="mt-2 text-[var(--color-ink-soft)]">Every recipe you&apos;ve saved, ready to cook again.</p>
      </div>

      {typedSaved.length > 0 ? (
        <div className="space-y-3">
          {typedSaved.map((item) => {
            const recipe = item.recipe_data;
            const dogName = item.dogs?.name;
            const methodLabel =
              recipe.method === "slow_cooker"
                ? "Slow Cooker"
                : recipe.method === "one_pot"
                  ? "One Pot"
                  : recipe.method === "oven"
                    ? "Oven"
                    : null;

            return (
              <div
                key={item.id}
                className="flex items-start justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] px-6 py-5"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-xl text-[var(--color-ink)]">
                    {recipe.name ?? "Untitled recipe"}
                  </p>
                  {recipe.tagline && (
                    <p className="mt-1 text-sm italic text-[var(--color-ink-soft)]">
                      {recipe.tagline}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {dogName && (
                      <span className="rounded-full border border-[var(--color-border)] px-3 py-0.5 text-xs text-[var(--color-ink-soft)]">
                        {dogName}
                      </span>
                    )}
                    {methodLabel && (
                      <span className="rounded-full border border-[var(--color-border)] px-3 py-0.5 text-xs text-[var(--color-ink-soft)]">
                        {methodLabel}
                      </span>
                    )}
                  </div>
                </div>
                {item.is_favourite && (
                  <span
                    className="shrink-0 text-[var(--color-accent)]"
                    title="Favourite"
                    aria-label="Favourite"
                  >
                    ★
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] p-10 text-center">
          <p className="font-heading text-2xl text-[var(--color-ink)]">No saved recipes yet.</p>
          <p className="mt-2 text-[var(--color-ink-soft)]">
            Generate a recipe plan for your dog and save the ones you want to cook again.
          </p>
          <Link
            href="/onboard"
            className="mt-6 inline-block rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[var(--color-cream)] transition-transform hover:-translate-y-0.5"
          >
            Generate recipes →
          </Link>
        </div>
      )}
    </div>
  );
}
