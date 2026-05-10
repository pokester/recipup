export type HealthLog = {
  week_start: string;
  weight_kg: number | null;
  energy_level: "low" | "normal" | "high" | null;
  coat_score: number | null;
  appetite: "refusing" | "reduced" | "normal" | "enthusiastic" | null;
  itching: "none" | "occasional" | "frequent" | null;
  joint_stiffness: "none" | "mild" | "noticeable" | null;
  digestion: "great" | "variable" | "unsettled" | null;
  vomiting: "none" | "once" | "more_than_once" | null;
};

export type RecipeAdjustment = {
  type: string;
  reason: string;
  instruction: string;
};

export type HealthAnalysisResult = {
  adjustments: RecipeAdjustment[];
  response_message: string;
  vet_flag: boolean;
  vet_message: string | null;
};

type DogProfile = {
  goal: string;
  weight_kg: number;
  health_conditions: string[];
  dog_name?: string;
};

function name(profile: DogProfile): string {
  return profile.dog_name ?? "Your dog";
}

export function analyseHealthLogs(
  recentLogs: HealthLog[],
  dogProfile: DogProfile,
): HealthAnalysisResult {
  const adjustments: RecipeAdjustment[] = [];
  const messages: string[] = [];
  let vet_flag = false;
  let vet_message: string | null = null;

  if (recentLogs.length === 0) {
    return {
      adjustments: [],
      response_message: "Everything's looking great this week — no changes needed. Keep it up. 🐾",
      vet_flag: false,
      vet_message: null,
    };
  }

  const latest = recentLogs[0];
  const dogName = name(dogProfile);

  // ── VET TRIGGERS ──

  // 1. Vomiting more than once in latest log
  if (latest.vomiting === "more_than_once") {
    vet_flag = true;
    vet_message =
      "Vomiting noted this week. This is something to mention to your vet — recipe changes alone won't address it. If it continues, please book an appointment.";
  }

  // 2. Weight loss > 1kg over 3 consecutive logs (goal not lose_weight)
  if (!vet_flag && dogProfile.goal !== "lose_weight" && recentLogs.length >= 3) {
    const weights = recentLogs.slice(0, 3).map((l) => l.weight_kg).filter((w): w is number => w !== null);
    if (weights.length === 3) {
      const loss = weights[2] - weights[0];
      if (loss < -1) {
        const lossAmt = Math.abs(loss).toFixed(1);
        vet_flag = true;
        vet_message = `${dogName} has lost ${lossAmt}kg over the past 3 weeks. This is worth discussing with your vet.`;
      }
    }
  }

  // 3. Appetite refusing for 2+ consecutive logs
  if (!vet_flag && recentLogs.length >= 2) {
    const refusing = recentLogs.slice(0, 2).every((l) => l.appetite === "refusing");
    if (refusing) {
      vet_flag = true;
      vet_message = `${dogName} has been refusing food for two weeks. Please speak to your vet — this needs attention beyond recipe changes.`;
    }
  }

  // ── RECIPE ADJUSTMENT TRIGGERS ──

  // 4. Coat score ≤ 2 for 2+ consecutive logs
  if (recentLogs.length >= 2) {
    const lowCoat = recentLogs.slice(0, 2).every((l) => l.coat_score !== null && l.coat_score <= 2);
    if (lowCoat) {
      adjustments.push({
        type: "increase_omega3",
        reason: "coat score low for 2+ weeks",
        instruction:
          "Increase Omega-3 sources — prioritise sardines, salmon, or flaxseed. Add fish oil supplement note.",
      });
      messages.push(
        `${dogName}'s coat score has been low. We've added more Omega-3 to the next recipes — look out for more sardines and salmon.`,
      );
    }
  }

  // 5. Energy low for 2+ consecutive logs
  if (recentLogs.length >= 2) {
    const lowEnergy = recentLogs.slice(0, 2).every((l) => l.energy_level === "low");
    if (lowEnergy) {
      adjustments.push({
        type: "increase_calories",
        reason: "energy low for 2+ weeks",
        instruction:
          "Increase daily calorie target by 10%. Check portion sizes are adequate for this dog's weight.",
      });
      messages.push(
        `${dogName}'s been a bit low on energy. We've increased the calorie targets for next week's recipes slightly.`,
      );
    }
  }

  // 6. Weight gain > 0.5kg over 2 logs AND goal is maintain_weight
  if (dogProfile.goal === "maintain_weight" && recentLogs.length >= 2) {
    const w0 = recentLogs[0].weight_kg;
    const w1 = recentLogs[1].weight_kg;
    if (w0 !== null && w1 !== null && w0 - w1 > 0.5) {
      adjustments.push({
        type: "reduce_calories",
        reason: "weight trending up, goal is maintenance",
        instruction:
          "Reduce daily calorie target by 10%. Increase lean protein ratio. Reduce carbohydrate portions.",
      });
      messages.push(
        `${dogName}'s weight has crept up slightly. We've adjusted next week's recipes to be a little leaner — same great food, more mindful portions.`,
      );
    }
  }

  // 7. Weight loss > 0.5kg over 2 logs AND goal is maintain_weight
  if (dogProfile.goal === "maintain_weight" && recentLogs.length >= 2) {
    const w0 = recentLogs[0].weight_kg;
    const w1 = recentLogs[1].weight_kg;
    if (w0 !== null && w1 !== null && w1 - w0 > 0.5) {
      adjustments.push({
        type: "increase_calories",
        reason: "weight trending down, goal is maintenance",
        instruction:
          "Increase daily calorie target by 10%. Check portions are appropriate for current weight.",
      });
      messages.push(`${dogName}'s weight has dipped slightly. We've added a bit more to next week's portions.`);
    }
  }

  // 8. Itching frequent for 2+ consecutive logs
  if (recentLogs.length >= 2) {
    const frequentItching = recentLogs.slice(0, 2).every((l) => l.itching === "frequent");
    if (frequentItching) {
      adjustments.push({
        type: "flag_allergen_review",
        reason: "persistent itching noted",
        instruction:
          "Flag potential allergen response. Suggest reviewing recently introduced ingredients. Consider elimination approach.",
      });
      messages.push(
        `${dogName} has been scratching more than usual. This can sometimes be a food sensitivity — we've flagged it for review when you next generate recipes.`,
      );
    }
  }

  // 9. Joint stiffness noticeable for 2+ consecutive logs
  if (recentLogs.length >= 2) {
    const stiffJoints = recentLogs.slice(0, 2).every((l) => l.joint_stiffness === "noticeable");
    if (stiffJoints) {
      adjustments.push({
        type: "increase_antiinflammatory",
        reason: "joint stiffness noted",
        instruction:
          "Increase anti-inflammatory ingredients: Omega-3 (sardines, salmon, flaxseed), turmeric where appropriate. Check glucosamine supplement status.",
      });
      messages.push(
        `${dogName}'s joints seem stiffer lately. We've adjusted next week's recipes to include more anti-inflammatory ingredients and checked the supplement suggestions.`,
      );
    }
  }

  // 10. Digestion unsettled for 2+ consecutive logs
  if (recentLogs.length >= 2) {
    const unsettled = recentLogs.slice(0, 2).every((l) => l.digestion === "unsettled");
    if (unsettled) {
      adjustments.push({
        type: "adjust_fibre",
        reason: "digestive issues noted",
        instruction:
          "Adjust fibre balance — use easily digestible carbohydrates (white rice, plain pumpkin). Reduce rich fats temporarily. Flag sensitive stomach if not already set.",
      });
      messages.push(
        `${dogName}'s digestion has been a bit unsettled. We've simplified next week's recipes to be gentler on the stomach.`,
      );
    }
  }

  const response_message =
    messages.length > 0
      ? messages.join(" ")
      : "Everything's looking great this week — no changes needed. Keep it up. 🐾";

  return { adjustments, response_message, vet_flag, vet_message };
}

export function buildHealthPromptContext(
  recentLogs: HealthLog[],
  adjustments: RecipeAdjustment[],
): string {
  if (recentLogs.length === 0) return "";

  const latest = recentLogs[0];

  const weights = recentLogs.map((l) => l.weight_kg).filter((w): w is number => w !== null);
  let weightTrend = "stable";
  if (weights.length >= 2) {
    const diff = weights[0] - weights[weights.length - 1];
    if (diff > 0.3) weightTrend = `gaining (up ${diff.toFixed(1)}kg over last ${weights.length} weeks)`;
    else if (diff < -0.3) weightTrend = `losing (down ${Math.abs(diff).toFixed(1)}kg over last ${weights.length} weeks)`;
  }

  const coatScores = recentLogs.map((l) => l.coat_score).filter((c): c is number => c !== null);
  let coatTrend = "";
  if (coatScores.length >= 2) {
    const diff = coatScores[0] - coatScores[coatScores.length - 1];
    coatTrend = diff > 0 ? " (improving)" : diff < 0 ? " (declining)" : " (stable)";
  }

  const lines = [
    `HEALTH HISTORY CONTEXT:`,
    `Latest log (${latest.week_start}):`,
    latest.weight_kg !== null ? `- Weight: ${latest.weight_kg}kg` : null,
    `- Weight trend: ${weightTrend}`,
    latest.energy_level ? `- Energy: ${latest.energy_level}` : null,
    latest.coat_score !== null ? `- Coat: ${latest.coat_score}/5${coatTrend}` : null,
    latest.appetite ? `- Appetite: ${latest.appetite}` : null,
  ].filter(Boolean) as string[];

  if (adjustments.length > 0) {
    lines.push("", "RECIPE ADJUSTMENTS REQUIRED:");
    for (const adj of adjustments) {
      lines.push(`- ${adj.instruction}`);
    }
    lines.push("", "Apply all adjustments to every recipe generated in this session.");
  }

  return lines.join("\n");
}
