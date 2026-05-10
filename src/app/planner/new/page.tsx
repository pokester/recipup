import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { PlannerNewWizard } from "@/components/planner/PlannerNewWizard";

export default async function PlannerNewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: dogs }, { data: library }] = await Promise.all([
    supabase
      .from("profiles")
      .select("subscription_tier, trial_ends_at")
      .eq("id", user.id)
      .single(),
    supabase
      .from("dogs")
      .select("id, name, breed")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("saved_recipes")
      .select("id, recipe_data, dogs(name)")
      .eq("user_id", user.id)
      .order("saved_at", { ascending: false })
      .limit(20),
  ]);

  const inTrial = profile?.trial_ends_at
    ? new Date(profile.trial_ends_at as string) > new Date()
    : false;
  const hasPlannerAccess =
    ["pack", "pack_pro", "founding"].includes((profile?.subscription_tier as string) ?? "") ||
    inTrial;

  if (!hasPlannerAccess) redirect("/planner");
  if (!dogs || dogs.length === 0) redirect("/onboard");

  return (
    <Suspense>
      <PlannerNewWizard
        initialDogs={
          (dogs ?? []) as { id: string; name: string; breed: string | null }[]
        }
        initialLibrary={
          (library ?? []) as unknown as {
            id: string;
            recipe_data: { name?: string; tagline?: string; method?: string; safety_score?: number };
            dogs: { name: string } | null;
          }[]
        }
      />
    </Suspense>
  );
}
