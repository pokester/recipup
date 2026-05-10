import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { PlanView } from "@/components/planner/PlanView";

export default async function PlanPage({ params }: { params: Promise<{ plan_id: string }> }) {
  const { plan_id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, trial_ends_at")
    .eq("id", user.id)
    .single();

  const inTrial = profile?.trial_ends_at
    ? new Date(profile.trial_ends_at as string) > new Date()
    : false;
  const hasPlannerAccess =
    ["pack", "pack_pro", "founding"].includes((profile?.subscription_tier as string) ?? "") ||
    inTrial;

  if (!hasPlannerAccess) redirect("/planner");

  return (
    <Suspense>
      <PlanView planId={plan_id} />
    </Suspense>
  );
}
