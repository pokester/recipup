import { NextResponse } from "next/server";

type DogProfile = Record<string, unknown>;
type ClaudeRecipeLike = { safety_score: number } & Record<string, unknown>;
type ClaudeParsedResponse = {
  recipes?: unknown[];
} & Record<string, unknown>;

function extractFirstJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const raw = fenced?.[1] ?? text;
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
  const candidate = raw.slice(firstBrace, lastBrace + 1);
  return candidate;
}

async function callClaude(dogProfile: DogProfile) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY");
  }

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
- Never include any ingredient listed in allergens or other_exclusions
- For health conditions, apply these rules:
  kidney_disease stage 3-4: strict low phosphorus, low protein, avoid high-potassium ingredients
  diabetes: low glycaemic index only, no white rice, no sweet potato, use brown rice or lentils
  heart_disease on medication: low sodium strictly
  overweight: reduce fat, increase lean protein, 10-20% calorie reduction from maintenance
  joint_issues: increase Omega-3 (sardines, salmon, flaxseed), avoid inflammatory ingredients
  cancer: high protein, high Omega-3, low simple carbohydrates
  sensitive_stomach: easily digestible ingredients only, no rich fats, plain proteins`;

  const userPrompt = `Generate 3 personalised dog food recipes for this dog. Return ONLY valid JSON, no other text.
Dog profile: ${JSON.stringify(dogProfile)}
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
          "notes": "string (optional)"
        }
      ],
      "instructions": [
        "string"
      ],
      "nutrition_per_day": {
        "calories": number,
        "protein_g": number,
        "fat_g": number,
        "carbs_g": number,
        "notes": "string"
      },
      "safety_score": number,
      "safety_notes": "string",
      "breed_notes": "string (optional — only if breed-specific rules were applied)"
    }
  ],
  "supplement_recommendations": [
    {
      "name": "string",
      "reason": "string",
      "daily_amount": "string"
    }
  ],
  "vet_flag": boolean,
  "vet_message": "string (only if vet_flag is true)"
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2500,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: userPrompt }],
        },
      ],
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic request failed (${res.status})`);
  }

  const data = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };

  const text = data.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new Error("Missing Claude response text");

  const jsonText = extractFirstJson(text);
  if (!jsonText) throw new Error("Claude did not return JSON");

  const parsed = JSON.parse(jsonText) as unknown;
  return parsed as {
    recipes?: Array<{ safety_score?: number }>;
  } & Record<string, unknown>;
}

export async function POST(req: Request) {
  try {
    const dogProfile = (await req.json()) as DogProfile;
    const parsed = (await callClaude(dogProfile)) as ClaudeParsedResponse;

    // Ensure the contract holds and hide any unsafe recipes.
    if (Array.isArray(parsed.recipes)) {
      const safeRecipes = parsed.recipes.filter(
        (r): r is ClaudeRecipeLike => {
          if (!r || typeof r !== "object") return false;
          const score = (r as Record<string, unknown>).safety_score;
          return typeof score === "number" && score >= 50;
        },
      );
      return NextResponse.json({ ...parsed, recipes: safeRecipes }, { status: 200 });
    }

    return NextResponse.json(parsed, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Recipe generation failed" },
      { status: 500 },
    );
  }
}

