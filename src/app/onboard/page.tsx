"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

const BREEDS = [
  "Labrador Retriever",
  "Golden Retriever",
  "German Shepherd",
  "French Bulldog",
  "Bulldog",
  "Poodle",
  "Beagle",
  "Rottweiler",
  "Yorkshire Terrier",
  "Dachshund",
  "Boxer",
  "Siberian Husky",
  "Great Dane",
  "Doberman Pinscher",
  "Shih Tzu",
  "Border Collie",
  "Australian Shepherd",
  "Cavalier King Charles Spaniel",
  "Pomeranian",
  "Chihuahua",
  "Cocker Spaniel",
  "Dalmatian",
  "Weimaraner",
  "Vizsla",
  "Rhodesian Ridgeback",
  "Staffordshire Bull Terrier",
  "West Highland Terrier",
  "Schnauzer",
  "Maltese",
  "Bichon Frise",
  "Bernese Mountain Dog",
  "Newfoundland",
  "Saint Bernard",
  "Akita",
  "Samoyed",
  "Shar Pei",
  "Basenji",
  "Whippet",
  "Greyhound",
  "Irish Setter",
  "Mixed / Other",
];

const HEALTH_OPTIONS = [
  "Allergies",
  "Kidney Disease",
  "Diabetes",
  "Overweight",
  "Heart Disease",
  "Joint Issues",
  "Sensitive Stomach",
  "Cancer",
  "None / Healthy",
];

const ACTIVITY_LEVELS = [
  { id: "low", emoji: "🛋️", title: "Low", description: "Mostly naps" },
  {
    id: "moderate",
    emoji: "🚶",
    title: "Moderate",
    description: "1-2 walks/day",
  },
  {
    id: "active",
    emoji: "🏃",
    title: "Active",
    description: "Lots of outdoor play",
  },
  {
    id: "working",
    emoji: "🐕‍🦺",
    title: "Working",
    description: "Sport or working dog",
  },
];

const ALLERGENS = [
  "Chicken",
  "Beef",
  "Lamb",
  "Fish",
  "Dairy",
  "Eggs",
  "Wheat",
  "Corn",
  "Soy",
  "Rice",
];

const GOALS = [
  {
    id: "maintain",
    emoji: "⚖",
    title: "Maintain Weight",
    description: "Keep current healthy weight",
  },
  {
    id: "lose",
    emoji: "↓",
    title: "Lose Weight",
    description: "Reduce calories, lean proteins",
  },
  {
    id: "gain",
    emoji: "↑",
    title: "Gain Weight",
    description: "Higher calorie, nutrient-dense",
  },
  {
    id: "build",
    emoji: "◆",
    title: "Build Muscle",
    description: "High protein, active lifestyle",
  },
  {
    id: "senior",
    emoji: "♥",
    title: "Senior Support",
    description: "Joint health, easy digestion",
  },
  {
    id: "puppy",
    emoji: "★",
    title: "Puppy Growth",
    description: "Balanced growth nutrition",
  },
];

const KIDNEY_STAGES = [
  { id: "stage_1", label: "Stage 1" },
  { id: "stage_2", label: "Stage 2" },
  { id: "stage_3", label: "Stage 3" },
  { id: "stage_4", label: "Stage 4" },
  { id: "not_yet_diagnosed", label: "Not yet diagnosed" },
];

const INSULIN_OPTIONS = [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
  { id: "not_sure", label: "Not sure" },
];

const CARDIAC_OPTIONS = [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
  { id: "not_sure", label: "Not sure" },
];

function toNumberOrUndefined(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function uniqLower(tokens: string[]) {
  return Array.from(new Set(tokens.map((t) => t.trim().toLowerCase()).filter(Boolean)));
}

function parseCommaSeparatedList(value: string) {
  return value
    .split(/[,;\n]/g)
    .map((v) => v.trim())
    .filter(Boolean);
}

type FormState = {
  dogName: string;
  breed: string;
  age: string;
  weight: string;
  weightUnit: "kg" | "lbs";
  sex: "Male" | "Female" | "";

  healthConditions: string[];
  kidneyStage: string;
  diabetesInsulinDependent: string;
  vetConfirmedAllergens: string;
  overweightTargetWeightKg: string;
  heartMedication: string;
  jointSupplementsTaking: "yes" | "no" | "";
  jointSupplementsText: string;
  sensitiveStomachTriggers: string;
  cancerType: string;

  activityLevel: string;

  dietType: "Cooked" | "Raw (BARF)";
  allergens: string[];
  otherAvoid: string;

  goal: string;
  notes: string;
};

function buildAgentPayload(form: FormState) {
  const noneSelected = form.healthConditions.includes("None / Healthy");

  const weightKg =
    form.weightUnit === "kg"
      ? toNumberOrUndefined(form.weight)
      : form.weightUnit === "lbs" && toNumberOrUndefined(form.weight)
        ? toNumberOrUndefined(form.weight)! / 2.20462262185
        : undefined;

  const ageYears = toNumberOrUndefined(form.age);
  const sex = form.sex ? form.sex.toLowerCase() : undefined;

  const goalSlugById: Record<string, string> = {
    maintain: "maintain_weight",
    lose: "lose_weight",
    gain: "gain_weight",
    build: "build_muscle",
    senior: "senior_support",
    puppy: "puppy_growth",
  };

  const conditionSlugByLabel: Record<string, string> = {
    "Kidney Disease": "kidney_disease",
    Diabetes: "diabetes",
    Allergies: "allergies",
    Overweight: "overweight",
    "Heart Disease": "heart_disease",
    "Joint Issues": "joint_issues",
    "Sensitive Stomach": "sensitive_stomach",
    Cancer: "cancer",
    "None / Healthy": "none_healthy",
  };

  const selectedConditions = noneSelected
    ? []
    : form.healthConditions
        .map((label) => conditionSlugByLabel[label])
        .filter(Boolean);

  const vetAllergenTokens = parseCommaSeparatedList(form.vetConfirmedAllergens);
  const mergedAllergens = uniqLower([...form.allergens, ...vetAllergenTokens]);

  const dog: Record<string, unknown> = {
    ...(form.breed.trim() ? { breed: form.breed.trim().toLowerCase() } : {}),
    ...(ageYears !== undefined ? { age_years: ageYears } : {}),
    ...(weightKg !== undefined ? { weight_kg: weightKg } : {}),
    ...(sex ? { sex } : {}),
    ...(form.activityLevel ? { activity_level: form.activityLevel.toLowerCase() } : {}),
  };

  const diet: Record<string, unknown> = {
    ...(form.dietType ? { type: form.dietType === "Cooked" ? "cooked" : "raw" } : {}),
    ...(form.goal
      ? { goal: goalSlugById[form.goal]?.toLowerCase() ?? form.goal.toLowerCase() }
      : {}),
    ...(mergedAllergens.length ? { allergens: mergedAllergens } : {}),
    ...(form.otherAvoid.trim() ? { other_exclusions: form.otherAvoid.trim().toLowerCase() } : {}),
  };

  const health: Record<string, unknown> = {
    conditions: selectedConditions,
    ...(selectedConditions.includes("kidney_disease") && form.kidneyStage
      ? { kidney_stage: form.kidneyStage.toLowerCase() }
      : {}),
    ...(selectedConditions.includes("diabetes") && form.diabetesInsulinDependent
      ? { insulin_dependent: form.diabetesInsulinDependent.toLowerCase() }
      : {}),
    ...(selectedConditions.includes("heart_disease") && form.heartMedication
      ? { cardiac_medication: form.heartMedication.toLowerCase() }
      : {}),
    ...(selectedConditions.includes("overweight") &&
    toNumberOrUndefined(form.overweightTargetWeightKg) !== undefined
      ? { overweight_target_weight_kg: toNumberOrUndefined(form.overweightTargetWeightKg) }
      : {}),
    ...(selectedConditions.includes("joint_issues") &&
    form.jointSupplementsTaking === "yes" &&
    form.jointSupplementsText.trim()
      ? { joint_supplements: form.jointSupplementsText.trim().toLowerCase() }
      : {}),
    ...(selectedConditions.includes("sensitive_stomach") && form.sensitiveStomachTriggers.trim()
      ? { trigger_foods: form.sensitiveStomachTriggers.trim().toLowerCase() }
      : {}),
    ...(selectedConditions.includes("cancer") && form.cancerType.trim()
      ? { cancer_type: form.cancerType.trim().toLowerCase() }
      : {}),
    ...(form.notes.trim() ? { notes: form.notes.trim().toLowerCase() } : {}),
  };

  return {
    dog_name: form.dogName.trim().toLowerCase(),
    dog,
    diet,
    health,
  };
}

export default function OnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [agentPayload, setAgentPayload] = useState<Record<string, unknown> | null>(null);

  const [form, setForm] = useState<FormState>({
    dogName: "",
    breed: "",
    age: "",
    weight: "",
    weightUnit: "kg",
    sex: "",

    healthConditions: [],
    kidneyStage: "",
    diabetesInsulinDependent: "",
    vetConfirmedAllergens: "",
    overweightTargetWeightKg: "",
    heartMedication: "",
    jointSupplementsTaking: "",
    jointSupplementsText: "",
    sensitiveStomachTriggers: "",
    cancerType: "",

    activityLevel: "",

    dietType: "Cooked",
    allergens: [],
    otherAvoid: "",

    goal: "",
    notes: "",
  });

  const noneSelected = form.healthConditions.includes("None / Healthy");

  const canGoNext = useMemo(() => {
    if (step === 1) {
      return (
        form.dogName.trim().length > 0 &&
        form.breed.trim().length > 0 &&
        toNumberOrUndefined(form.age) !== undefined &&
        (toNumberOrUndefined(form.age) as number) > 0 &&
        toNumberOrUndefined(form.weight) !== undefined &&
        (toNumberOrUndefined(form.weight) as number) > 0 &&
        form.sex.length > 0
      );
    }

    if (step === 2) {
      if (form.healthConditions.length === 0) return false;
      if (form.activityLevel.length === 0) return false;
      // Step 2 Next availability is based strictly on the required selections:
      // health conditions + activity level. Detail fields are used for payload generation.
      return true;
    }

    if (step === 3) return true;
    if (step === 4) return form.goal.length > 0;
    return false;
  }, [form, step]);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const toggleHealthCondition = (item: string) => {
    setForm((current) => {
      if (item === "None / Healthy") {
        return { ...current, healthConditions: ["None / Healthy"] };
      }

      const withoutNone = current.healthConditions.filter(
        (condition) => condition !== "None / Healthy",
      );
      const exists = withoutNone.includes(item);

      return {
        ...current,
        healthConditions: exists
          ? withoutNone.filter((condition) => condition !== item)
          : [...withoutNone, item],
      };
    });
  };

  const toggleAllergen = (item: string) => {
    setForm((current) => {
      const exists = current.allergens.includes(item);
      return {
        ...current,
        allergens: exists
          ? current.allergens.filter((entry) => entry !== item)
          : [...current.allergens, item],
      };
    });
  };

  const goBack = () => {
    if (step === 1) {
      router.push("/");
      return;
    }
    setStep((current) => current - 1);
  };

  const goNext = () => {
    if (!canGoNext || step >= 5) return;
    if (step === 4) {
      setAgentPayload(buildAgentPayload(form));
    }
    setStep((current) => current + 1);
  };

  const generateRecipes = () => {
    if (isGenerating) return;
    const payload = agentPayload ?? buildAgentPayload(form);
    setAgentPayload(payload);
    // Verify the structured output before wiring into an API.
    console.log(payload);

    try {
      window.localStorage.setItem(
        "recipup_dog_profile",
        JSON.stringify(payload),
      );
    } catch {
      // localStorage can fail in some environments; API flow will surface the error.
    }

    setIsGenerating(true);
    setTimeout(() => {
      router.push("/recipes");
    }, 1400);
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10 md:px-10 md:py-14">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
          Step {step} of 5
        </p>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full border ${
                index < step
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
                  : "border-[var(--color-border-strong)] bg-[var(--color-cream-soft)]"
              }`}
            />
          ))}
        </div>
      </div>

      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] p-6 md:p-8">
        {step === 1 && (
          <div className="space-y-6">
            <h1 className="font-heading text-4xl text-[var(--color-ink)]">
              Meet your pup
            </h1>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-[var(--color-ink-soft)]">
                  Dog&apos;s name
                </span>
                <input
                  value={form.dogName}
                  onChange={(event) => updateForm("dogName", event.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-cream)] px-4 outline-none focus:border-[var(--color-accent)]"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[var(--color-ink-soft)]">Breed</span>
                <input
                  list="breed-options"
                  value={form.breed}
                  onChange={(event) => updateForm("breed", event.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-cream)] px-4 outline-none focus:border-[var(--color-accent)]"
                />
                <datalist id="breed-options">
                  {BREEDS.map((breed) => (
                    <option key={breed} value={breed} />
                  ))}
                </datalist>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[var(--color-ink-soft)]">
                  Age (years)
                </span>
                <input
                  type="number"
                  min={0}
                  value={form.age}
                  onChange={(event) => updateForm("age", event.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-cream)] px-4 outline-none focus:border-[var(--color-accent)]"
                />
              </label>

              <div className="space-y-2">
                <span className="text-sm text-[var(--color-ink-soft)]">Weight</span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    value={form.weight}
                    onChange={(event) => updateForm("weight", event.target.value)}
                    className="h-11 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-cream)] px-4 outline-none focus:border-[var(--color-accent)]"
                  />
                  <div className="inline-flex rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-cream)] p-1">
                    {(["kg", "lbs"] as const).map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => updateForm("weightUnit", unit)}
                        className={`rounded-lg px-3 py-1 text-sm ${
                          form.weightUnit === unit
                            ? "bg-[var(--color-accent)] text-[var(--color-cream)]"
                            : "text-[var(--color-ink-soft)]"
                        }`}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-sm text-[var(--color-ink-soft)]">Sex</span>
                <div className="flex gap-2">
                  {(["Male", "Female"] as const).map((sex) => (
                    <button
                      key={sex}
                      type="button"
                      onClick={() => updateForm("sex", sex)}
                      className={`rounded-full border px-4 py-2 text-sm ${
                        form.sex === sex
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-cream)]"
                          : "border-[var(--color-border-strong)] text-[var(--color-ink-soft)]"
                      }`}
                    >
                      {sex}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h1 className="font-heading text-4xl text-[var(--color-ink)]">
              Health profile
            </h1>

            <div className="space-y-3">
              <p className="text-sm text-[var(--color-ink-soft)]">
                Health conditions
              </p>
              <div className="flex flex-wrap gap-2">
                {HEALTH_OPTIONS.map((condition) => {
                  const selected = form.healthConditions.includes(condition);
                  return (
                    <button
                      key={condition}
                      type="button"
                      onClick={() => toggleHealthCondition(condition)}
                      className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                        selected
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-cream)]"
                          : "border-[var(--color-border-strong)] text-[var(--color-ink-soft)]"
                      }`}
                    >
                      {condition}
                    </button>
                  );
                })}
              </div>

              {!noneSelected && (
                <div className="mt-6 space-y-4">
                  {form.healthConditions.includes("Kidney Disease") && (
                    <DetailBlock title="What stage has your vet diagnosed?">
                      <SingleSelectChips
                        options={KIDNEY_STAGES}
                        value={form.kidneyStage}
                        onChange={(v) => updateForm("kidneyStage", v)}
                      />
                    </DetailBlock>
                  )}

                  {form.healthConditions.includes("Diabetes") && (
                    <DetailBlock title="Is your dog insulin-dependent?">
                      <SingleSelectChips
                        options={INSULIN_OPTIONS}
                        value={form.diabetesInsulinDependent}
                        onChange={(v) =>
                          updateForm("diabetesInsulinDependent", v)
                        }
                      />
                    </DetailBlock>
                  )}

                  {form.healthConditions.includes("Allergies") && (
                    <DetailBlock title="Which allergens has your vet confirmed?">
                      <input
                        value={form.vetConfirmedAllergens}
                        onChange={(event) =>
                          updateForm("vetConfirmedAllergens", event.target.value)
                        }
                        className="h-11 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-cream)] px-4 outline-none focus:border-[var(--color-accent)]"
                      />
                    </DetailBlock>
                  )}

                  {form.healthConditions.includes("Overweight") && (
                    <DetailBlock title="Has your vet given a target weight? (optional)">
                      <input
                        type="number"
                        min={0}
                        value={form.overweightTargetWeightKg}
                        onChange={(event) =>
                          updateForm("overweightTargetWeightKg", event.target.value)
                        }
                        className="h-11 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-cream)] px-4 outline-none focus:border-[var(--color-accent)]"
                      />
                    </DetailBlock>
                  )}

                  {form.healthConditions.includes("Heart Disease") && (
                    <DetailBlock title="Is your dog on cardiac medication?">
                      <SingleSelectChips
                        options={CARDIAC_OPTIONS}
                        value={form.heartMedication}
                        onChange={(v) => updateForm("heartMedication", v)}
                      />
                    </DetailBlock>
                  )}

                  {form.healthConditions.includes("Joint Issues") && (
                    <DetailBlock title="Is your dog currently taking any joint supplements?">
                      <div className="flex flex-wrap gap-2">
                        {(["yes", "no"] as const).map((option) => {
                          const selected = form.jointSupplementsTaking === option;
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() =>
                                updateForm("jointSupplementsTaking", option)
                              }
                              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                                selected
                                  ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-cream)]"
                                  : "border-[var(--color-border-strong)] text-[var(--color-ink-soft)]"
                              }`}
                            >
                              {option === "yes" ? "Yes" : "No"}
                            </button>
                          );
                        })}
                      </div>

                      {form.jointSupplementsTaking === "yes" && (
                        <div className="mt-4">
                          <p className="text-sm text-[var(--color-ink-soft)]">
                            Which supplements?
                          </p>
                          <input
                            value={form.jointSupplementsText}
                            onChange={(event) =>
                              updateForm("jointSupplementsText", event.target.value)
                            }
                            className="mt-2 h-11 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-cream)] px-4 outline-none focus:border-[var(--color-accent)]"
                          />
                        </div>
                      )}
                    </DetailBlock>
                  )}

                  {form.healthConditions.includes("Sensitive Stomach") && (
                    <DetailBlock title="Any known trigger foods? (optional)">
                      <textarea
                        value={form.sensitiveStomachTriggers}
                        onChange={(event) =>
                          updateForm(
                            "sensitiveStomachTriggers",
                            event.target.value,
                          )
                        }
                        className="min-h-24 w-full resize-none rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-cream)] p-4 outline-none focus:border-[var(--color-accent)]"
                      />
                    </DetailBlock>
                  )}

                  {form.healthConditions.includes("Cancer") && (
                    <DetailBlock title="Type of cancer if known (optional)">
                      <input
                        value={form.cancerType}
                        onChange={(event) =>
                          updateForm("cancerType", event.target.value)
                        }
                        className="h-11 w-full rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-cream)] px-4 outline-none focus:border-[var(--color-accent)]"
                      />
                    </DetailBlock>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm text-[var(--color-ink-soft)]">Activity level</p>
              <div className="grid gap-3 md:grid-cols-2">
                {ACTIVITY_LEVELS.map((level) => {
                  const selected = form.activityLevel === level.id;
                  return (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => updateForm("activityLevel", level.id)}
                      className={`rounded-2xl border p-4 text-left transition-colors ${
                        selected
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
                          : "border-[var(--color-border-strong)] bg-transparent"
                      }`}
                    >
                      <p
                        className={`text-xl ${
                          selected ? "text-[var(--color-cream)]" : ""
                        }`}
                      >
                        {level.emoji}
                      </p>
                      <p
                        className={`mt-2 font-semibold ${
                          selected
                            ? "text-[var(--color-cream)]"
                            : "text-[var(--color-ink)]"
                        }`}
                      >
                        {level.title}
                      </p>
                      <p
                        className={`text-sm ${
                          selected ? "text-[var(--color-cream)]/90" : "text-[var(--color-ink-soft)]"
                        }`}
                      >
                        {level.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h1 className="font-heading text-4xl text-[var(--color-ink)]">
              Diet & allergies
            </h1>
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-ink-soft)]">Diet type</p>
              <div className="inline-flex rounded-full border border-[var(--color-border-strong)] bg-[var(--color-cream)] p-1">
                {(["Cooked", "Raw (BARF)"] as const).map((diet) => {
                  const selected = form.dietType === diet;
                  return (
                    <button
                      key={diet}
                      type="button"
                      onClick={() => updateForm("dietType", diet)}
                      className={`rounded-full px-5 py-2 text-sm transition-colors ${
                        selected
                          ? "bg-[var(--color-accent)] text-[var(--color-cream)]"
                          : "text-[var(--color-ink-soft)]"
                      }`}
                    >
                      {diet}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-[var(--color-ink-soft)]">
                Common allergens (optional)
              </p>
              <div className="flex flex-wrap gap-2">
                {ALLERGENS.map((allergen) => {
                  const selected = form.allergens.includes(allergen);
                  return (
                    <button
                      key={allergen}
                      type="button"
                      onClick={() => toggleAllergen(allergen)}
                      className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                        selected
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-cream)]"
                          : "border-[var(--color-border-strong)] text-[var(--color-ink-soft)]"
                      }`}
                    >
                      {allergen}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="space-y-2">
              <span className="text-sm text-[var(--color-ink-soft)]">
                Any other ingredients to avoid?
              </span>
              <textarea
                value={form.otherAvoid}
                onChange={(event) => updateForm("otherAvoid", event.target.value)}
                className="min-h-28 w-full resize-none rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-cream)] p-4 outline-none focus:border-[var(--color-accent)]"
              />
            </label>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h1 className="font-heading text-4xl text-[var(--color-ink)]">Goals</h1>
            <div className="grid gap-3 md:grid-cols-2">
              {GOALS.map((goal) => {
                const selected = form.goal === goal.id;
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => updateForm("goal", goal.id)}
                    className={`rounded-2xl border p-4 text-left transition-colors ${
                      selected
                        ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
                        : "border-[var(--color-border-strong)] bg-transparent"
                    }`}
                  >
                    <p
                      className={`text-xl ${selected ? "text-[var(--color-cream)]" : "text-[var(--color-ink)]"}`}
                    >
                      {goal.emoji}
                    </p>
                    <p
                      className={`mt-2 font-semibold ${
                        selected ? "text-[var(--color-cream)]" : "text-[var(--color-ink)]"
                      }`}
                    >
                      {goal.title}
                    </p>
                    <p
                      className={`text-sm ${
                        selected ? "text-[var(--color-cream)]/90" : "text-[var(--color-ink-soft)]"
                      }`}
                    >
                      {goal.description}
                    </p>
                  </button>
                );
              })}
            </div>
            <label className="space-y-2">
              <span className="text-sm text-[var(--color-ink-soft)]">
                Anything else we should know?
              </span>
              <textarea
                value={form.notes}
                onChange={(event) => updateForm("notes", event.target.value)}
                className="min-h-28 w-full resize-none rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-cream)] p-4 outline-none focus:border-[var(--color-accent)]"
              />
            </label>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-cream)] p-6">
              <h1 className="font-heading text-3xl text-[var(--color-ink)]">
                🐶 {form.dogName}&apos;s summary
              </h1>

              <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
                <SummaryRow label="Breed" value={form.breed} />
                <SummaryRow label="Age" value={`${form.age} years`} />
                <SummaryRow
                  label="Weight"
                  value={`${form.weight} ${form.weightUnit}`}
                />
                <SummaryRow label="Sex" value={form.sex} />

                <SummaryRow
                  label="Health conditions"
                  value={form.healthConditions.join(", ")}
                />

                <SummaryRow
                  label="Activity level"
                  value={
                    ACTIVITY_LEVELS.find((level) => level.id === form.activityLevel)
                      ?.title ?? ""
                  }
                />

                <SummaryRow label="Diet type" value={form.dietType} />

                <SummaryRow
                  label="Goal"
                  value={GOALS.find((goal) => goal.id === form.goal)?.title ?? ""}
                />

                <SummaryRow
                  label="Allergens"
                  value={
                    form.allergens.length ? form.allergens.join(", ") : ""
                  }
                />

                {form.healthConditions.includes("Kidney Disease") && (
                  <SummaryRow
                    label="Kidney stage"
                    value={
                      KIDNEY_STAGES.find((s) => s.id === form.kidneyStage)?.label ?? ""
                    }
                  />
                )}

                {form.healthConditions.includes("Diabetes") && (
                  <SummaryRow
                    label="Insulin-dependent?"
                    value={
                      INSULIN_OPTIONS.find((o) => o.id === form.diabetesInsulinDependent)
                        ?.label ?? ""
                    }
                  />
                )}

                {form.healthConditions.includes("Allergies") && (
                  <SummaryRow
                    label="Vet-confirmed allergens"
                    value={form.vetConfirmedAllergens.trim()}
                  />
                )}

                {form.healthConditions.includes("Overweight") &&
                  form.overweightTargetWeightKg.trim() && (
                    <SummaryRow
                      label="Target weight (kg)"
                      value={form.overweightTargetWeightKg.trim()}
                    />
                  )}

                {form.healthConditions.includes("Heart Disease") && (
                  <SummaryRow
                    label="On cardiac medication?"
                    value={
                      CARDIAC_OPTIONS.find((o) => o.id === form.heartMedication)?.label ??
                      ""
                    }
                  />
                )}

                {form.healthConditions.includes("Joint Issues") && (
                  <>
                    <SummaryRow
                      label="Taking joint supplements?"
                      value={
                        form.jointSupplementsTaking
                          ? form.jointSupplementsTaking === "yes"
                            ? "Yes"
                            : "No"
                          : ""
                      }
                    />
                    {form.jointSupplementsTaking === "yes" &&
                      form.jointSupplementsText.trim() && (
                        <SummaryRow
                          label="Supplements"
                          value={form.jointSupplementsText.trim()}
                        />
                      )}
                  </>
                )}

                {form.healthConditions.includes("Sensitive Stomach") &&
                  form.sensitiveStomachTriggers.trim() && (
                    <SummaryRow
                      label="Trigger foods"
                      value={form.sensitiveStomachTriggers.trim()}
                    />
                  )}

                {form.healthConditions.includes("Cancer") &&
                  form.cancerType.trim() && (
                    <SummaryRow
                      label="Cancer type"
                      value={form.cancerType.trim()}
                    />
                  )}

                <SummaryRow
                  label="Other ingredients to avoid"
                  value={form.otherAvoid.trim() ? form.otherAvoid.trim() : ""}
                />
                <SummaryRow
                  label="Additional notes"
                  value={form.notes.trim() ? form.notes.trim() : ""}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={generateRecipes}
              disabled={isGenerating}
              className={`rounded-full bg-[var(--color-accent)] px-7 py-3 text-sm font-semibold text-[var(--color-cream)] ${
                isGenerating
                  ? "animate-pulse"
                  : "transition-transform hover:-translate-y-0.5"
              }`}
            >
              {isGenerating
                ? `Building ${form.dogName}'s recipe plan...`
                : "Generate my recipes →"}
            </button>
            <p className="text-xs text-[var(--color-ink-soft)]">
              Recipup recipes are a guide. Always consult a vet before making
              significant dietary changes.
            </p>
          </div>
        )}
      </section>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          className="rounded-full border border-[var(--color-border-strong)] px-5 py-2 text-sm text-[var(--color-ink)]"
        >
          Back
        </button>

        {step < 5 ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!canGoNext}
            className="rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-[var(--color-cream)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-full border border-[var(--color-border-strong)] px-5 py-2 text-sm text-[var(--color-ink)]"
          >
            Return home
          </button>
        )}
      </div>
    </div>
  );
}

function DetailBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="border-l-4 border-[var(--color-accent)] bg-[var(--color-cream-soft)] pl-4 py-4">
      <p className="text-sm font-semibold text-[var(--color-ink)]">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function SingleSelectChips<T extends { id: string; label: string }>(props: {
  options: T[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {props.options.map((opt) => {
        const selected = props.value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => props.onChange(opt.id)}
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${
              selected
                ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-cream)]"
                : "border-[var(--color-border-strong)] text-[var(--color-ink-soft)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] px-3 py-2">
      <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-accent)]">{label}</p>
      <p className="mt-1 text-[var(--color-ink)]">{value || ""}</p>
    </div>
  );
}
