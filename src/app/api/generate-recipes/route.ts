import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateRecipeCost, compareToKibble, compareToCompetitors } from "@/lib/cost-estimator";
import { analyseHealthLogs, buildHealthPromptContext, type HealthLog } from "@/lib/health-analysis";
import { sanitisePromptPayload, sanitisePromptText } from "@/lib/prompt-safety";
import { handleAPIError } from "@/lib/api-error";

export const maxDuration = 60;

type DogProfile = Record<string, unknown>;
type ClaudeRecipeLike = { safety_score: number } & Record<string, unknown>;
type ClaudeParsedResponse = { recipes?: unknown[] } & Record<string, unknown>;

function sanitiseInput(str: string | undefined, maxLength: number): string {
  if (!str) return "";
  return sanitisePromptText(str, maxLength);
}

function extractFirstJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const raw = fenced?.[1] ?? text;
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
  return raw.slice(firstBrace, lastBrace + 1);
}

async function callClaude(dogProfile: DogProfile, model: string, pantryContext?: string, costTarget?: string, healthContext?: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

  const systemPrompt = `You are a canine nutritionist and cookbook author. You create personalised home-cooking recipes for dogs based on their profile. You are warm, knowledgeable, and precise. You always prioritise the dog's health and safety above all else.
CRITICAL SAFETY RULES — never include these ingredients in any recipe: xylitol, grapes, raisins, onions, garlic, chives, leeks, chocolate, macadamia nuts, avocado, alcohol, caffeine, cooked bones, nutmeg.
RECIPE REQUIREMENTS:
- All recipes must be one-pot or slow cooker format
- Provide exact gram amounts for every ingredient
- All recipes must be nutritionally balanced for the dog's profile
- Follow AAFCO standards for cooked recipes, prey model ratios for raw
- Apply breed-specific rules where relevant (e.g. low-purine for Dalmatians, low-phosphorus for kidney disease dogs)
- Adjust calories using RER formula:
  RER = 70 × (weight_kg ^ 0.75)
  Then multiply by activity factor:
  low = 1.2, moderate = 1.4, active = 1.6, working = 1.8
  If sex is "male_neutered" or "female_spayed", apply an additional 0.9× multiplier (neutered/spayed dogs need ~10% fewer calories)
- Never include any ingredient listed in allergens or other_exclusions
- For health conditions, apply these rules:
  kidney_disease stage 3-4: strict low phosphorus, low protein, avoid high-potassium ingredients
  diabetes: low glycaemic index only, no white rice, no sweet potato, use brown rice or lentils
  heart_disease on medication: low sodium strictly
  overweight: reduce fat, increase lean protein, 10-20% calorie reduction from maintenance
  joint_issues: increase Omega-3 (sardines, salmon, flaxseed), avoid inflammatory ingredients
  cancer: high protein, high Omega-3, low simple carbohydrates
  sensitive_stomach: easily digestible ingredients only, no rich fats, plain proteins`;

  const basePrompt = `Generate 3 personalised dog food recipes for this dog. Return ONLY valid JSON, no other text.
Dog profile: ${JSON.stringify(dogProfile)}${costTarget ? `\n\n${costTarget}` : ""}
Return this exact structure:
{
  "dog_name": "string",
  "daily_calories": number,
  "recipes": [
    {
      "id": "string",
      "name": "string",
      "tagline": "string",
      "method": "slow_cooker" | "one_pot" | "oven",
      "prep_time_mins": number,
      "cook_time_mins": number,
      "serves_days": number,
      "ingredients": [
        {
          "name": "string",
          "grams": number,
          "cups": "string",
          "notes": "string (optional)",
          "needs_purchasing": boolean,
          "running_low": boolean
        }
      ],
      "instructions": ["string"],
      "nutrition_per_day": {
        "calories": number,
        "protein_g": number,
        "fat_g": number,
        "carbs_g": number,
        "notes": "string"
      },
      "safety_score": number,
      "safety_notes": "string",
      "breed_notes": "string (optional)"
    }
  ],
  "supplement_recommendations": [
    { "name": "string", "reason": "string", "daily_amount": "string" }
  ],
  "vet_flag": boolean,
  "vet_message": "string (only if vet_flag is true)"
}`;

  const parts = [healthContext, pantryContext, basePrompt].filter(Boolean);
  const userPrompt = parts.join("\n\n");

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
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
              { type: "text", text: userPrompt },
            ],
          },
        ],
        temperature: 0.4,
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

  if (!res.ok) throw new Error(`Anthropic request failed (${res.status})`);

  const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
  const text = data.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new Error("Missing Claude response text");

  const jsonText = extractFirstJson(text);
  if (!jsonText) throw new Error("Claude did not return JSON");

  return JSON.parse(jsonText) as { recipes?: Array<{ safety_score?: number }> } & Record<string, unknown>;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as DogProfile & { pantry_context?: string };
    const { pantry_context: pantryContext, ...rawDogProfile } = body;
    const dogProfile = sanitisePromptPayload(rawDogProfile) as DogProfile;

    // Auth guard
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });

    // Sanitise user-controlled fields before prompt injection
    const dogObj = dogProfile.dog as Record<string, unknown> | undefined;
    if (dogObj) {
      if (typeof dogObj.name === "string") dogObj.name = sanitiseInput(dogObj.name, 50);
      if (typeof dogObj.notes === "string") dogObj.notes = sanitiseInput(dogObj.notes, 500);
      if (typeof dogObj.other_exclusions === "string") dogObj.other_exclusions = sanitiseInput(dogObj.other_exclusions, 500);
      if (dogObj.health_detail && typeof dogObj.health_detail === "object") {
        const hd = dogObj.health_detail as Record<string, unknown>;
        for (const k of Object.keys(hd)) {
          if (typeof hd[k] === "string") hd[k] = sanitiseInput(hd[k] as string, 300);
        }
      }
    }
    const sanitisedPantry = pantryContext ? sanitiseInput(pantryContext, 10000) : undefined;

    // Fetch profile for tier, limits, market, and model selection
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, trial_ends_at, market")
      .eq("id", user.id)
      .single();

    const now = new Date();
    const trialActive = profile?.trial_ends_at
      ? new Date(profile.trial_ends_at as string) > now
      : false;
    const tier = profile?.subscription_tier as string | null;
    const isFreeUser = (tier === "free" || tier === null) && !trialActive;
    const hasCostAccess = !isFreeUser;
    const market = (profile?.market as "uk" | "nl") ?? "uk";

    // Monthly limit — free tier only
    if (isFreeUser) {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count } = await supabase
        .from("recipe_generations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth);
      if (count !== null && count >= 3) {
        console.log(`[rate-limit] user:${user.id} tier:free monthly_limit_reached`);
        return Response.json({
          error: "monthly_limit_reached",
          message: "You've used your 3 free recipe generations this month. Upgrade to Pack for unlimited recipes.",
          upgrade_url: "/pricing",
        }, { status: 403 });
      }
    }

    // Hourly rate limit — all tiers
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("recipe_generations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneHourAgo);
    if (recentCount !== null && recentCount >= 10) {
      console.log(`[rate-limit] user:${user.id} tier:${tier} hourly_rate_limit_exceeded count:${recentCount}`);
      return Response.json({
        error: "rate_limit_exceeded",
        message: "You've generated a lot of recipes this hour. Take a breather — you can generate more in a little while.",
      }, { status: 429 });
    }

    // Model selection by tier
    const model = (trialActive || tier === "pack" || tier === "pack_pro" || tier === "founding")
      ? "claude-sonnet-4-20250514"
      : "claude-haiku-4-5-20251001";
    console.log(`[recipe-generation] user:${user.id} tier:${tier} model:${model} trial_active:${trialActive}`);

    // Build cost targeting prompt if the dog has a known food spend
    const dogBase = (dogProfile.dog as Record<string, unknown> | undefined) ?? {};
    const foodSpendMonthly = dogBase.current_food_spend_monthly as number | undefined;
    const weightKg = dogBase.weight_kg as number | undefined;

    let costTarget: string | undefined;
    if (foodSpendMonthly && foodSpendMonthly > 0) {
      const cur = market === "nl" ? "€" : "£";
      const dailyBudget = (foodSpendMonthly / 30.4).toFixed(2);
      costTarget = `COST TARGET:\nThe user currently spends ${cur}${foodSpendMonthly}/month on dog food (${cur}${dailyBudget}/day). Where nutritionally possible, target ingredients that keep daily food cost at or below this amount. Flag in breed_notes if this target cannot be met nutritionally.`;
    }

    // Fetch health context
    let healthContext: string | undefined;
    try {
      const dogId = dogObj?.id as string | undefined;
      if (dogId) {
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
          healthContext = buildHealthPromptContext(healthLogs as HealthLog[], analysis.adjustments) || undefined;
        }
      }
    } catch {
      // Non-critical — proceed without health context
    }

    const parsed = (await callClaude(dogProfile, model, sanitisedPantry, costTarget, healthContext)) as ClaudeParsedResponse;

    // Log generation
    try {
      await supabase.from("recipe_generations").insert({
        user_id: user.id,
        dog_id: dogObj?.id as string | null ?? null,
        profile_snapshot: dogProfile,
        recipes_generated: Array.isArray(parsed.recipes) ? parsed.recipes.length : 0,
      });
    } catch {
      // Non-fatal
    }

    // Filter unsafe recipes
    if (!Array.isArray(parsed.recipes)) {
      return NextResponse.json({ ...parsed, has_cost_access: hasCostAccess, market }, { status: 200 });
    }

    const safeRecipes = parsed.recipes.filter((r): r is ClaudeRecipeLike => {
      if (!r || typeof r !== "object") return false;
      const score = (r as Record<string, unknown>).safety_score;
      return typeof score === "number" && score >= 50;
    });

    // Attach cost data to each recipe
    const recipesWithCosts = await Promise.all(
      safeRecipes.map(async (recipe) => {
        try {
          const ingredients = (recipe.ingredients as Array<{ name: string; grams: number }> | undefined) ?? [];
          const servingDays = (recipe.serves_days as number | undefined) ?? 1;
          const cost = await calculateRecipeCost({ ingredients, serves_days: servingDays }, market, servingDays);

          let kibble_comparison = undefined;
          let competitor_comparisons = undefined;
          if (weightKg && weightKg > 0) {
            kibble_comparison = compareToKibble(cost.cost_per_day, foodSpendMonthly ?? null, weightKg, market);
            competitor_comparisons = compareToCompetitors(cost.cost_per_day, weightKg, market);
          }

          return {
            ...recipe,
            cost_per_day_gbp: market === "uk" ? cost.cost_per_day : undefined,
            cost_per_day_eur: market === "nl" ? cost.cost_per_day : undefined,
            cost_breakdown: cost.cost_breakdown,
            has_unpriced_items: cost.has_unpriced_items,
            unpriced_items: cost.unpriced_items,
            price_sync_date: cost.price_sync_date,
            kibble_comparison,
            competitor_comparisons,
          };
        } catch {
          return recipe;
        }
      }),
    );

    return NextResponse.json({ ...parsed, recipes: recipesWithCosts, has_cost_access: hasCostAccess, market }, { status: 200 });
  } catch (err) {
    return handleAPIError(err);
  }
}
