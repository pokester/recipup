import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyseHealthLogs, type HealthLog } from "@/lib/health-analysis";
import { handleAPIError } from "@/lib/api-error";

function getWeekStart(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as {
      dog_id: string;
      weight_kg?: number | null;
      energy_level?: string | null;
      coat_score?: number | null;
      appetite?: string | null;
      itching?: string | null;
      joint_stiffness?: string | null;
      digestion?: string | null;
      vomiting?: string | null;
      notes?: string | null;
      week_start?: string;
    };

    const { dog_id, week_start: suppliedWeekStart, ...metrics } = body;

    // Verify dog ownership
    const { data: dog } = await supabase
      .from("dogs")
      .select("id, name, goal, weight_kg, health_conditions")
      .eq("id", dog_id)
      .eq("user_id", user.id)
      .single();
    if (!dog) return NextResponse.json({ message: "Dog not found" }, { status: 404 });

    const week_start = suppliedWeekStart ?? getWeekStart();

    // Fetch last 4 weeks of logs for analysis
    let existingLogs = null;
    try {
      const result = await supabase
        .from("health_logs")
        .select(
          "week_start, weight_kg, energy_level, coat_score, appetite, itching, joint_stiffness, digestion, vomiting",
        )
        .eq("dog_id", dog_id)
        .neq("week_start", week_start)
        .order("week_start", { ascending: false })
        .limit(4);
      existingLogs = result.data;
    } catch (err) {
      console.error(`[health-log] Failed to fetch history for dog:${dog_id}`, err);
      // Non-critical — proceed without history
    }

    const typedDog = dog as {
      id: string;
      name: string;
      goal: string | null;
      weight_kg: number | null;
      health_conditions: string[];
    };

    // Build this week's log as first entry for analysis
    const thisWeekLog: HealthLog = {
      week_start,
      weight_kg: metrics.weight_kg ?? null,
      energy_level: (metrics.energy_level as HealthLog["energy_level"]) ?? null,
      coat_score: metrics.coat_score ?? null,
      appetite: (metrics.appetite as HealthLog["appetite"]) ?? null,
      itching: (metrics.itching as HealthLog["itching"]) ?? null,
      joint_stiffness: (metrics.joint_stiffness as HealthLog["joint_stiffness"]) ?? null,
      digestion: (metrics.digestion as HealthLog["digestion"]) ?? null,
      vomiting: (metrics.vomiting as HealthLog["vomiting"]) ?? null,
    };

    const allLogs: HealthLog[] = [thisWeekLog, ...((existingLogs ?? []) as HealthLog[])];

    const analysis = analyseHealthLogs(allLogs, {
      goal: typedDog.goal ?? "maintain_weight",
      weight_kg: typedDog.weight_kg ?? 20,
      health_conditions: typedDog.health_conditions ?? [],
      dog_name: typedDog.name,
    });

    // Upsert the log
    const { data: savedLog, error } = await supabase
      .from("health_logs")
      .upsert(
        {
          user_id: user.id,
          dog_id,
          week_start,
          weight_kg: metrics.weight_kg ?? null,
          energy_level: metrics.energy_level ?? null,
          coat_score: metrics.coat_score ?? null,
          appetite: metrics.appetite ?? null,
          itching: metrics.itching ?? null,
          joint_stiffness: metrics.joint_stiffness ?? null,
          digestion: metrics.digestion ?? null,
          vomiting: metrics.vomiting ?? null,
          notes: metrics.notes ?? null,
          recipe_adjustments: analysis.adjustments,
          response_message: analysis.response_message,
          vet_flag: analysis.vet_flag,
          vet_message: analysis.vet_message,
        },
        { onConflict: "dog_id,week_start" },
      )
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({
      id: (savedLog as { id: string } | null)?.id,
      analysis,
    });
  } catch (err) {
    return handleAPIError(err);
  }
}
