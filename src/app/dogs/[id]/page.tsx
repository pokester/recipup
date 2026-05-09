import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DogHubClient } from "@/components/dogs/DogHubClient";

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

  // Show last week's response card if it was logged in the last 7 days
  const latestLog = healthLogs[0] ?? null;
  const isRecentLog =
    latestLog &&
    Date.now() - new Date(latestLog.week_start).getTime() < 7 * 24 * 60 * 60 * 1000;
  const latestLogResponse = isRecentLog ? latestLog : null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 md:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-4xl text-[var(--color-ink)]">{dog.name}</h1>
            <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
              {[capitalize(dog.breed), ageLabel(dog.age_years), dog.weight_kg != null ? `${dog.weight_kg}kg` : null, capitalize(dog.sex)]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {dog.goal && (
                <span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-ink-soft)]">
                  {capitalize(dog.goal)}
                </span>
              )}
              {dog.diet_type && (
                <span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-ink-soft)]">
                  {capitalize(dog.diet_type)}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/onboard?dog_id=${dog.id}`}
              className="rounded-full border border-[var(--color-border-strong)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
            >
              Edit profile
            </Link>
            <Link
              href={`/onboard?dog_id=${dog.id}`}
              className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-cream)] transition-transform hover:-translate-y-0.5"
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
