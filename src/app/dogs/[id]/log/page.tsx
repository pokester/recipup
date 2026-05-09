import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HealthLogForm } from "@/components/dogs/HealthLogForm";

export default async function HealthLogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check Pack Pro / trial access
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, trial_ends_at")
    .eq("id", user.id)
    .single();
  const typedProfile = profile as { subscription_tier: string | null; trial_ends_at: string | null } | null;
  const tier = typedProfile?.subscription_tier ?? "free";
  const inTrial = typedProfile?.trial_ends_at ? new Date(typedProfile.trial_ends_at) > new Date() : false;
  const hasAccess = ["pack_pro", "founding"].includes(tier) || inTrial;
  if (!hasAccess) redirect(`/dogs/${id}#health`);

  const { data: dogData } = await supabase
    .from("dogs")
    .select("id, name, health_conditions")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!dogData) redirect("/dogs");

  const dog = dogData as { id: string; name: string; health_conditions: string[] };
  const hasJointCondition = (dog.health_conditions ?? []).includes("joint_issues");

  // Fetch last log for pre-fill
  const { data: lastLog } = await supabase
    .from("health_logs")
    .select("week_start, weight_kg, energy_level, coat_score, appetite, itching, joint_stiffness, digestion, vomiting, notes")
    .eq("dog_id", id)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  type LastLog = {
    week_start: string;
    weight_kg: number | null;
    energy_level: string | null;
    coat_score: number | null;
    appetite: string | null;
    itching: string | null;
    joint_stiffness: string | null;
    digestion: string | null;
    vomiting: string | null;
    notes: string | null;
  };

  const typedLastLog = lastLog as LastLog | null;

  const previousWeekLabel = typedLastLog?.week_start
    ? new Date(typedLastLog.week_start).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 md:px-8">
      <Link
        href={`/dogs/${id}`}
        className="mb-6 inline-block text-sm font-semibold text-[var(--color-ink-soft)] hover:text-[var(--color-accent)]"
      >
        ← Back to {dog.name}&apos;s profile
      </Link>

      <div className="mb-8">
        <h1 className="font-heading text-3xl text-[var(--color-ink)]">
          How&apos;s {dog.name} doing this week? 🐾
        </h1>
        <p className="mt-2 text-[var(--color-ink-soft)]">Takes about 60 seconds.</p>
        {typedLastLog && (
          <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
            Pre-filled from your last log ({previousWeekLabel}). Just update what&apos;s changed.
          </p>
        )}
      </div>

      <HealthLogForm
        dogId={dog.id}
        dogName={dog.name}
        hasJointCondition={hasJointCondition}
        defaultValues={typedLastLog}
        previousWeekLabel={previousWeekLabel}
      />
    </div>
  );
}
