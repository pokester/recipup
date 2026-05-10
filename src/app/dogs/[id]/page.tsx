import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DogHubClient } from "@/components/dogs/DogHubClient";

function isWithinLastDays(dateStr: string, days: number): boolean {
  return Date.now() - new Date(dateStr).getTime() < days * 24 * 60 * 60 * 1000;
}

type Dog = {
  id: string;
  name: string;
  breed: string | null;
  age_years: number | null;
  weight_kg: number | null;
  sex: string | null;
  goal: string | null;
  diet_type: string | null;
};

function capitalize(s: string | null) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

function toTitleCase(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

function ageLabel(years: number | null) {
  if (years === null) return null;
  if (years < 1) return "Puppy";
  if (years >= 8) return `${years}y (senior)`;
  return `${years}y`;
}

export default async function DogHubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: dogData }, { data: profile }] = await Promise.all([
    supabase
      .from("dogs")
      .select("id, name, breed, age_years, weight_kg, sex, goal, diet_type")
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("profiles")
      .select("subscription_tier, trial_ends_at")
      .eq("id", user.id)
      .single(),
  ]);

  if (!dogData) redirect("/dogs");

  const dog = dogData as Dog;
  const tier = (profile as { subscription_tier: string | null; trial_ends_at: string | null } | null)?.subscription_tier ?? "free";
  const trialEnd = (profile as { subscription_tier: string | null; trial_ends_at: string | null } | null)?.trial_ends_at;
  const inTrial = trialEnd ? new Date(trialEnd) > new Date() : false;
  const hasHealthAccess = ["pack_pro", "founding"].includes(tier) || inTrial;

  const [{ data: healthLogsData }, { data: activePlanData }, { data: allPlansData }, { data: savedRecipesData }] =
    await Promise.all([
      supabase
        .from("health_logs")
        .select("id, week_start, weight_kg, energy_level, coat_score, appetite, itching, joint_stiffness, digestion, vomiting, notes, recipe_adjustments, response_message, vet_flag, vet_message")
        .eq("dog_id", id)
        .order("week_start", { ascending: false })
        .limit(52),
      supabase
        .from("meal_plans")
        .select("id, start_date, end_date, cooking_frequency, status")
        .eq("dog_id", id)
        .eq("user_id", user.id)
        .lte("start_date", new Date().toISOString().split("T")[0])
        .gte("end_date", new Date().toISOString().split("T")[0])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("meal_plans")
        .select("id, start_date, end_date, cooking_frequency, status")
        .eq("dog_id", id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("saved_recipes")
        .select("id, recipe_data, saved_at")
        .eq("dog_id", id)
        .eq("user_id", user.id)
        .order("saved_at", { ascending: false })
        .limit(20),
    ]);

  const healthLogs = (healthLogsData ?? []) as Parameters<typeof DogHubClient>[0]["healthLogs"];
  const activePlan = activePlanData as Parameters<typeof DogHubClient>[0]["activePlan"];
  const allPlans = (allPlansData ?? []) as Parameters<typeof DogHubClient>[0]["allPlans"];
  const savedRecipes = (savedRecipesData ?? []) as Parameters<typeof DogHubClient>[0]["savedRecipes"];

  const latestLog = healthLogs[0] ?? null;
  const isRecentLog = latestLog && isWithinLastDays(latestLog.week_start, 7);
  const latestLogResponse = isRecentLog ? latestLog : null;

  const displayName = toTitleCase(dog.name);
  const subtitle = [capitalize(dog.breed), ageLabel(dog.age_years), dog.weight_kg != null ? `${dog.weight_kg}kg` : null, capitalize(dog.sex)]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {/* Back link */}
      <Link
        href="/dogs"
        className="mb-6 inline-block text-sm font-medium text-[var(--color-ink-500)] hover:text-[var(--color-ink)]"
      >
        ← All dogs
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[var(--color-coral)]/10">
              <span className="font-heading text-3xl font-semibold text-[var(--color-coral)]">
                {displayName.charAt(0)}
              </span>
            </div>
            <div>
              <h1 className="font-heading text-3xl text-[var(--color-ink)]">{displayName}</h1>
              {subtitle && (
                <p className="mt-1 text-sm text-[var(--color-ink-500)]">{subtitle}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {dog.goal && (
                  <span className="rounded-full border border-[var(--color-sand-deep)] px-3 py-1 text-xs text-[var(--color-ink-500)]">
                    {capitalize(dog.goal)}
                  </span>
                )}
                {dog.diet_type && (
                  <span className="rounded-full border border-[var(--color-sand-deep)] px-3 py-1 text-xs text-[var(--color-ink-500)]">
                    {capitalize(dog.diet_type)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/onboard?dog_id=${dog.id}`}
              className="rounded-full border border-[var(--color-sand-deep)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
            >
              Edit profile
            </Link>
            <Link
              href={`/onboard?dog_id=${dog.id}`}
              className="rounded-full bg-[var(--color-coral)] px-4 py-2 text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
            >
              Generate recipes →
            </Link>
          </div>
        </div>
      </div>

      <DogHubClient
        dog={dog}
        healthLogs={healthLogs}
        activePlan={activePlan}
        allPlans={allPlans}
        savedRecipes={savedRecipes}
        hasHealthAccess={hasHealthAccess}
        latestLogResponse={latestLogResponse}
      />
    </div>
  );
}
