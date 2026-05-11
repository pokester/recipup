import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyseHealthLogs, buildHealthPromptContext, type HealthLog } from "@/lib/health-analysis";
import { sanitisePromptPayload, sanitisePromptText } from "@/lib/prompt-safety";
import { handleAPIError } from "@/lib/api-error";

export const maxDuration = 120;

function sanitiseInput(str: string | undefined, maxLength: number): string {
  if (!str) return "";
  return sanitisePromptText(str, maxLength);
}

type PinnedDay = { day_number: number; recipe_data: Record<string, unknown> };

type RequestBody = {
  plan_id: string;
  week_number: number;
  dog_profile: Record<string, unknown>;
  pantry_context?: string;
  health_context?: string;
  cooking_frequency: "daily" | "twice_weekly" | "once_weekly";
  balance_type: "per_meal" | "week_balanced";
  budget_tier: "budget" | "standard" | "premium";
  plan_start_date: string;
  pinned_days?: PinnedDay[];
  existing_recipes?: Record<string, unknown>[];
};

type PlanDay = {
  day_number: number;
  day_name: string;
  is_pinned: boolean;
  cook_on_day: boolean;
  batch_note?: string;
  recipe: Record<string, unknown>;
};

type WeekResponse = {
  week_number: number;
  balance_type: string;
  weekly_nutrition_average: Record<string, number>;
  days: PlanDay[];
  shopping_summary: {
    ingredients_needed: Array<Record<string, unknown>>;
    estimated_total_cost_gbp: number;
    estimated_total_cost_eur: number;
    cost_per_day_gbp: number;
    cost_per_day_eur: number;
  };
};

function extractFirstJson(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const raw = fenced?.[1] ?? text;
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
  return raw.slice(firstBrace, lastBrace + 1);
}

async function generateWeekWithClaude(body: RequestBody, model: string): Promise<WeekResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

  const systemPrompt = `You are a canine nutritionist and meal planning expert. You create personalised weekly meal plans for dogs — varied, balanced, and practical for home cooks.

Apply all standard safety rules: never include xylitol, grapes, raisins, onions, garlic, chives, leeks, chocolate, macadamia nuts, avocado, alcohol, caffeine, cooked bones, or nutmeg.

BALANCE MODE — read carefully:
If balance_type is 'per_meal': Each recipe must independently hit the dog's full daily nutritional targets. Every meal stands alone.
If balance_type is 'week_balanced': The 7 recipes together must average the dog's daily nutritional targets. Individual meals may vary (higher protein one day, higher carbs another) as long as the weekly average is correct. This allows more variety and better reflects real cooking patterns.

PINNED DAYS: Some days already have recipes chosen by the user. These are locked — do not replace them. Account for their nutritional contribution when balancing the remaining days.

VARIETY RULES: No protein source should appear more than twice in a 7-day plan. No recipe should be identical to any recipe in existing_recipes (from other weeks). Aim for at least 3 different protein sources across the week.

COOKING FREQUENCY CONTEXT:
daily: recipes designed as single-day portions or small batches (1–2 days)
twice_weekly: recipes should batch to 3–4 days — adjust ingredient amounts accordingly
once_weekly: recipes should batch to 7 days — full week prep in one cook

COST ESTIMATES: Use realistic UK supermarket prices. Baseline: chicken breast £7/kg, brown rice £1.50/kg, carrots £0.80/kg, salmon £12/kg, sweet potato £1.20/kg, eggs £3/dozen, spinach £1.50/bag, beef mince £6/kg, turkey mince £5/kg. EUR = GBP × 1.18. Budget tier: prefer cheaper proteins and staples. Premium tier: favour salmon, turkey, fresh vegetables.`;

  const pinnedText = body.pinned_days?.length
    ? `\nPINNED DAYS (locked — do not replace these):\n${JSON.stringify(body.pinned_days, null, 2)}\n`
    : "\nNo days are pinned — generate all 7 days.\n";

  const existingText = body.existing_recipes?.length
    ? `\nEXISTING WEEK RECIPES (avoid repeating these for variety):\n${JSON.stringify(
        body.existing_recipes.map((r) => ({ name: (r as Record<string, unknown>).name })),
        null,
        2,
      )}\n`
    : "";

  const pantryText = body.pantry_context ? `${body.pantry_context}\n\n` : "";
  const healthText = body.health_context ? `${body.health_context}\n\n` : "";

  const userPrompt = `${healthText}${pantryText}Generate week ${body.week_number} of the meal plan. Return ONLY valid JSON, no other text.

Dog profile: ${JSON.stringify(body.dog_profile)}
Cooking frequency: ${body.cooking_frequency}
Balance type: ${body.balance_type}
Budget tier: ${body.budget_tier}
${pinnedText}${existingText}
Return this exact JSON structure (all 7 days, Monday=1 through Sunday=7):
{
  "week_number": ${body.week_number},
  "balance_type": "${body.balance_type}",
  "weekly_nutrition_average": { "calories": number, "protein_g": number, "fat_g": number, "carbs_g": number },
  "days": [
    {
      "day_number": 1,
      "day_name": "Monday",
      "is_pinned": false,
      "cook_on_day": true,
      "batch_note": "optional string e.g. Serves Mon-Wed",
      "recipe": {
        "id": "unique-string",
        "name": "string",
        "tagline": "string",
        "method": "slow_cooker|one_pot|oven",
        "prep_time_mins": number,
        "cook_time_mins": number,
        "serves_days": number,
        "ingredients": [{ "name": "string", "grams": number, "cups": "string", "notes": "string", "needs_purchasing": boolean, "running_low": boolean }],
        "instructions": ["string"],
        "nutrition_per_day": { "calories": number, "protein_g": number, "fat_g": number, "carbs_g": number, "notes": "string" },
        "safety_score": number,
        "safety_notes": "string"
      }
    }
  ],
  "shopping_summary": {
    "ingredients_needed": [
      {
        "name": "string",
        "total_grams": number,
        "total_cups": "string",
        "needs_purchasing": boolean,
        "running_low": boolean,
        "estimated_cost_gbp": number,
        "estimated_cost_eur": number,
        "tesco_search_url": "https://www.tesco.com/groceries/en-GB/search?query=NAME",
        "ah_search_url": "https://www.ah.nl/zoeken?query=NAME"
      }
    ],
    "estimated_total_cost_gbp": number,
    "estimated_total_cost_eur": number,
    "cost_per_day_gbp": number,
    "cost_per_day_eur": number
  }
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);
  let res!: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
      },
      body: JSON.stringify({
        model,
        max_tokens: 8192,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
              { type: "text", text: userPrompt },
            ],
          },
        ],
        temperature: 0.5,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      const e = new Error("AbortError");
      e.name = "AbortError";
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) throw new Error(`Anthropic error (${res.status})`);

  const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
  const text = data.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new Error("No Claude response text");

  const jsonText = extractFirstJson(text);
  if (!jsonText) throw new Error("Claude did not return JSON");

  return JSON.parse(jsonText) as WeekResponse;
}

export async function POST(req: Request) {
  try {
    const body = sanitisePromptPayload(await req.json()) as RequestBody;
    const { plan_id, week_number, plan_start_date } = body;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    // Verify ownership
    const { data: plan } = await supabase
      .from("meal_plans")
      .select("id, dog_id, user_id")
      .eq("id", plan_id)
      .eq("user_id", user.id)
      .single();
    if (!plan) return NextResponse.json({ message: "Plan not found" }, { status: 404 });

    // Model selection by tier
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, trial_ends_at")
      .eq("id", user.id)
      .single();
    const now = new Date();
    const trialActive = profile?.trial_ends_at
      ? new Date(profile.trial_ends_at as string) > now
      : false;
    const tier = profile?.subscription_tier as string | null;
    const model = (trialActive || tier === "pack" || tier === "pack_pro" || tier === "founding")
      ? "claude-sonnet-4-20250514"
      : "claude-haiku-4-5-20251001";

    // Inject health context if available
    if (!body.health_context) {
      try {
        const dogId = (plan as Record<string, unknown>).dog_id as string;
        const { data: healthLogs } = await supabase
          .from("health_logs")
          .select("week_start, weight_kg, energy_level, coat_score, appetite, itching, joint_stiffness, digestion, vomiting")
          .eq("dog_id", dogId)
          .order("week_start", { ascending: false })
          .limit(4);
        if (healthLogs && healthLogs.length > 0) {
          const { data: dogRow } = await supabase
            .from("dogs")
            .select("goal, weight_kg, health_conditions, name")
            .eq("id", dogId)
            .single();
          const typedDog = dogRow as { goal: string | null; weight_kg: number | null; health_conditions: string[]; name: string } | null;
          const analysis = analyseHealthLogs(healthLogs as HealthLog[], {
            goal: typedDog?.goal ?? "maintain_weight",
            weight_kg: typedDog?.weight_kg ?? 20,
            health_conditions: typedDog?.health_conditions ?? [],
            dog_name: typedDog?.name,
          });
          const ctx = buildHealthPromptContext(healthLogs as HealthLog[], analysis.adjustments);
          if (ctx) body.health_context = ctx;
        }
      } catch {
        // Non-critical
      }
    }

    // Sanitise user-controlled fields in the dog profile before prompt injection
    const dp = body.dog_profile as Record<string, unknown>;
    if (typeof dp.name === "string") dp.name = sanitiseInput(dp.name, 50);
    if (typeof dp.notes === "string") dp.notes = sanitiseInput(dp.notes, 500);
    if (typeof dp.other_exclusions === "string") dp.other_exclusions = sanitiseInput(dp.other_exclusions, 500);
    if (dp.health_detail && typeof dp.health_detail === "object") {
      const hd = dp.health_detail as Record<string, unknown>;
      for (const k of Object.keys(hd)) {
        if (typeof hd[k] === "string") hd[k] = sanitiseInput(hd[k] as string, 300);
      }
    }
    if (typeof body.pantry_context === "string") body.pantry_context = sanitiseInput(body.pantry_context, 10000);

    const weekData = await generateWeekWithClaude(body, model);

    // Calculate actual dates for each day of this week
    const weekStart = new Date(plan_start_date);
    weekStart.setDate(weekStart.getDate() + (week_number - 1) * 7);

    const dayRows = weekData.days.map((day) => {
      const dayDate = new Date(weekStart);
      dayDate.setDate(dayDate.getDate() + day.day_number - 1);
      return {
        plan_id,
        dog_id: (plan as Record<string, unknown>).dog_id as string,
        day_date: dayDate.toISOString().split("T")[0],
        day_number: day.day_number,
        recipe_data: {
          day_number: day.day_number,
          day_name: day.day_name,
          is_pinned: day.is_pinned,
          cook_on_day: day.cook_on_day,
          batch_note: day.batch_note ?? null,
          recipe: day.recipe,
        } as Record<string, unknown>,
        is_pinned: day.is_pinned,
        source: day.is_pinned ? "library" : "ai_generated",
      };
    });

    // Delete any existing days for this week range before inserting fresh ones
    const weekStartStr = weekStart.toISOString().split("T")[0];
    const weekEndDate = new Date(weekStart);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    const weekEndStr = weekEndDate.toISOString().split("T")[0];

    await supabase
      .from("meal_plan_days")
      .delete()
      .eq("plan_id", plan_id)
      .gte("day_date", weekStartStr)
      .lte("day_date", weekEndStr);

    await supabase.from("meal_plan_days").insert(dayRows);

    await supabase
      .from("meal_plans")
      .update({
        estimated_weekly_cost_gbp: weekData.shopping_summary.estimated_total_cost_gbp,
        estimated_weekly_cost_eur: weekData.shopping_summary.estimated_total_cost_eur,
        shopping_summary: weekData.shopping_summary as unknown as Record<string, unknown>,
        weekly_nutrition_avg: weekData.weekly_nutrition_average as unknown as Record<string, unknown>,
        week_number,
        updated_at: new Date().toISOString(),
      })
      .eq("id", plan_id);

    return NextResponse.json({ plan_id, week_data: weekData });
  } catch (err) {
    return handleAPIError(err);
  }
}
