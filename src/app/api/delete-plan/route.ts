import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleAPIError } from "@/lib/api-error";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { plan_id } = await request.json();
    if (!plan_id) {
      return NextResponse.json({ message: "Plan ID is required" }, { status: 400 });
    }

    // Verify the plan belongs to the user
    const { data: plan, error: fetchError } = await supabase
      .from("meal_plans")
      .select("id")
      .eq("id", plan_id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !plan) {
      return NextResponse.json({ message: "Plan not found" }, { status: 404 });
    }

    // Delete all meal plan days first (due to foreign key constraint)
    const { error: deleteDaysError } = await supabase
      .from("meal_plan_days")
      .delete()
      .eq("plan_id", plan_id);

    if (deleteDaysError) throw deleteDaysError;

    // Delete the meal plan
    const { error: deletePlanError } = await supabase
      .from("meal_plans")
      .delete()
      .eq("id", plan_id);

    if (deletePlanError) throw deletePlanError;

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleAPIError(err);
  }
}