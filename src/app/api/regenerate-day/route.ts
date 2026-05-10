import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const isDev = process.env.NODE_ENV === "development";

type RequestBody = {
  plan_id: string;
  dog_profile: Record<string, unknown>;
  pantry_context?: string;
  day_number: number;
  day_name: string;
  existing_week: Record<string, unknown>[];
  balance_type: "per_meal" | "week_balanced";
  budget_tier: string;
};

type RecipeOption = {
  option_number: 1 | 2 | 3;
  recipe: Record<string, unknown>;
};

type RegenerateResponse = {
  day_number: number;
  options: RecipeOption[];
};

function extractFirstJson(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const raw = fenced?.[1] ?? text;
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
  return raw.slice(firstBrace, lastBrace + 1);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ message: "Missing API key" }, { status: 500 });

    // Auth guard
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorised" }, { status: 401 });

    // Ownership check — verify plan belongs to authenticated user
    const { data: plan } = await supabase
      .from("meal_plans")
      .select("id")
      .eq("id", body.plan_id)
      .eq("user_id", user.id)
      .single();
    if (!plan) return Response.json({ error: "Forbidden" }, { status: 403 });

    const existingProteins = body.existing_week
      .map((d) => {
        const r = (d as Record<string, unknown>).recipe as Record<string, unknown> | undefined;
        return r?.name ?? "";
      })
      .filter(Boolean);

    const pantryText = body.pantry_context ? `${body.pantry_context}\n\n` : "";

    const systemPrompt = `You are a canine nutritionist. Generate 3 alternative recipe options for a single day of a dog's meal plan. Each option must use a different primary protein source and, where possible, a different cooking method. Apply standard canine safety rules: never include xylitol, grapes, raisins, onions, garlic, chives, leeks, chocolate, macadamia nuts, avocado, alcohol, caffeine, cooked bones, or nutmeg.`;

    const userPrompt = `${pantryText}Generate 3 recipe options for ${body.day_name} (day ${body.day_number}). Return ONLY valid JSON.

Dog profile: ${JSON.stringify(body.dog_profile)}
Balance type: ${body.balance_type}
Budget tier: ${body.budget_tier}
Other days this week (avoid repeating these proteins): ${existingProteins.join(", ")}

Return this exact structure:
{
  "day_number": ${body.day_number},
  "options": [
    {
      "option_number": 1,
      "recipe": {
        "id": "string",
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
    },
    { "option_number": 2, "recipe": { ... } },
    { "option_number": 3, "recipe": { ... } }
  ]
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
          model: "claude-haiku-4-5-20251001",
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
          temperature: 0.6,
        }),
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return Response.json({ error: "Recipe generation timed out. Please try again." }, { status: 504 });
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) throw new Error(`Anthropic error (${res.status})`);

    const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
    const text = data.content?.find((c) => c.type === "text")?.text;
    if (!text) throw new Error("No Claude response");

    const jsonText = extractFirstJson(text);
    if (!jsonText) throw new Error("Claude did not return JSON");

    const parsed = JSON.parse(jsonText) as RegenerateResponse;
    return NextResponse.json(parsed);
  } catch (err) {
    if (isDev) console.error("regenerate-day error:", err);
    return NextResponse.json({ message: "Regeneration failed" }, { status: 500 });
  }
}
