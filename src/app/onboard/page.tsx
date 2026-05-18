"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { withTimeout } from "@/lib/async";
import {
  DEFAULT_INGREDIENTS,
  DEFAULT_SUPPLEMENTS,
  DEFAULT_EQUIPMENT,
  RECIPE_AFFECTING_EQUIPMENT,
} from "@/lib/pantry-defaults";
import { savePantryItems, buildPantryPrompt, type Pantry } from "@/lib/pantry";

// ─── Constants ───────────────────────────────────────────────────────────────

const BREEDS = [
  "Labrador Retriever", "Golden Retriever", "German Shepherd", "French Bulldog",
  "Bulldog", "Poodle", "Beagle", "Rottweiler", "Yorkshire Terrier", "Dachshund",
  "Boxer", "Siberian Husky", "Great Dane", "Doberman Pinscher", "Shih Tzu",
  "Border Collie", "Australian Shepherd", "Cavalier King Charles Spaniel",
  "Pomeranian", "Chihuahua", "Cocker Spaniel", "Dalmatian", "Weimaraner",
  "Vizsla", "Rhodesian Ridgeback", "Staffordshire Bull Terrier",
  "West Highland Terrier", "Schnauzer", "Maltese", "Bichon Frise",
  "Bernese Mountain Dog", "Newfoundland", "Saint Bernard", "Akita", "Samoyed",
  "Shar Pei", "Basenji", "Whippet", "Greyhound", "Irish Setter", "Mixed / Other",
];

const HEALTH_OPTIONS = [
  "Allergies", "Kidney Disease", "Diabetes", "Overweight", "Heart Disease",
  "Joint Issues", "Sensitive Stomach", "Cancer", "None / Healthy",
];

const ACTIVITY_LEVELS = [
  { id: "low", emoji: "🛋️", title: "Low", description: "Mostly naps" },
  { id: "moderate", emoji: "🚶", title: "Moderate", description: "1-2 walks/day" },
  { id: "active", emoji: "🏃", title: "Active", description: "Lots of outdoor play" },
  { id: "working", emoji: "🐕‍🦺", title: "Working", description: "Sport or working dog" },
];

const ALLERGENS = [
  "Chicken", "Beef", "Lamb", "Fish", "Dairy", "Eggs", "Wheat", "Corn", "Soy", "Rice",
];

const GOALS = [
  { id: "maintain", emoji: "⚖", title: "Maintain weight", description: "Keep them at their ideal weight" },
  { id: "lose", emoji: "↓", title: "Lose weight", description: "Lean recipes, controlled portions" },
  { id: "gain", emoji: "↑", title: "Gain weight", description: "Calorie-dense, nutrient-rich meals" },
  { id: "build", emoji: "◆", title: "Build condition", description: "High protein for active dogs" },
  { id: "senior", emoji: "♥", title: "Senior support", description: "Gentle on joints, easy to digest" },
  { id: "puppy", emoji: "★", title: "Puppy growth", description: "Balanced nutrition as they grow" },
];

const DB_GOAL_TO_FORM: Record<string, string> = {
  maintain_weight: "maintain", lose_weight: "lose", gain_weight: "gain",
  build_muscle: "build", senior_support: "senior", puppy_growth: "puppy",
};

const DB_CONDITION_TO_LABEL: Record<string, string> = {
  kidney_disease: "Kidney Disease", diabetes: "Diabetes", allergies: "Allergies",
  overweight: "Overweight", heart_disease: "Heart Disease", joint_issues: "Joint Issues",
  sensitive_stomach: "Sensitive Stomach", cancer: "Cancer",
};

type DogRecord = {
  name: string | null;
  breed: string | null;
  age_years: number | null;
  weight_kg: number | null;
  sex: string | null;
  goal: string | null;
  diet_type: string | null;
  health_conditions: string[] | null;
  allergens: string[] | null;
  other_exclusions: string | null;
  activity_level: string | null;
  current_food_spend_monthly: number | null;
};

function buildPayloadFromRecord(dr: DogRecord): Record<string, unknown> {
  return {
    dog_name: (dr.name ?? "").toLowerCase(),
    dog: {
      ...(dr.breed ? { breed: dr.breed } : {}),
      ...(dr.age_years != null ? { age_years: dr.age_years } : {}),
      ...(dr.weight_kg != null ? { weight_kg: dr.weight_kg } : {}),
      ...(dr.sex ? { sex: dr.sex } : {}),
      ...(dr.activity_level ? { activity_level: dr.activity_level } : {}),
      ...(dr.current_food_spend_monthly != null ? { current_food_spend_monthly: dr.current_food_spend_monthly } : {}),
    },
    diet: {
      ...(dr.diet_type ? { type: dr.diet_type } : {}),
      ...(dr.goal ? { goal: dr.goal } : {}),
      ...(dr.allergens?.length ? { allergens: dr.allergens } : {}),
      ...(dr.other_exclusions ? { other_exclusions: dr.other_exclusions } : {}),
    },
    health: {
      conditions: dr.health_conditions ?? [],
    },
  };
}

const KIDNEY_STAGES = [
  { id: "stage_1", label: "Stage 1" }, { id: "stage_2", label: "Stage 2" },
  { id: "stage_3", label: "Stage 3" }, { id: "stage_4", label: "Stage 4" },
  { id: "not_yet_diagnosed", label: "Not yet diagnosed" },
];

const INSULIN_OPTIONS = [
  { id: "yes", label: "Yes" }, { id: "no", label: "No" }, { id: "not_sure", label: "Not sure" },
];

const CARDIAC_OPTIONS = [
  { id: "yes", label: "Yes" }, { id: "no", label: "No" }, { id: "not_sure", label: "Not sure" },
];

// ─── Types ───────────────────────────────────────────────────────────────────

type FormState = {
  dogName: string; breed: string; age: string; weight: string;
  weightUnit: "kg" | "lbs"; sex: "male_intact" | "female_intact" | "male_neutered" | "female_spayed" | "";
  foodSpendMonthly: string;
  healthConditions: string[]; kidneyStage: string; diabetesInsulinDependent: string;
  vetConfirmedAllergens: string; overweightTargetWeightKg: string; heartMedication: string;
  jointSupplementsTaking: "yes" | "no" | ""; jointSupplementsText: string;
  sensitiveStomachTriggers: string; cancerType: string; activityLevel: string;
  dietType: "Cooked" | "Raw (BARF)"; allergens: string[]; otherAvoid: string;
  goal: string; notes: string;
};

type IngredientRow = {
  name: string; unit: string; isAvailable: boolean; quantity: string; isRunningLow: boolean;
};

type EquipmentRow = {
  name: string; isAvailable: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toNumberOrUndefined(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function uniqLower(tokens: string[]) {
  return Array.from(new Set(tokens.map((t) => t.trim().toLowerCase()).filter(Boolean)));
}

function parseCommaSeparatedList(value: string) {
  return value.split(/[,;\n]/g).map((v) => v.trim()).filter(Boolean);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

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
    maintain: "maintain_weight", lose: "lose_weight", gain: "gain_weight",
    build: "build_muscle", senior: "senior_support", puppy: "puppy_growth",
  };
  const conditionSlugByLabel: Record<string, string> = {
    "Kidney Disease": "kidney_disease", Diabetes: "diabetes", Allergies: "allergies",
    Overweight: "overweight", "Heart Disease": "heart_disease", "Joint Issues": "joint_issues",
    "Sensitive Stomach": "sensitive_stomach", Cancer: "cancer", "None / Healthy": "none_healthy",
  };
  const selectedConditions = noneSelected
    ? []
    : form.healthConditions.map((l) => conditionSlugByLabel[l]).filter(Boolean);
  const vetAllergenTokens = parseCommaSeparatedList(form.vetConfirmedAllergens);
  const mergedAllergens = uniqLower([...form.allergens, ...vetAllergenTokens]);
  const foodSpendMonthly = toNumberOrUndefined(form.foodSpendMonthly);
  const dog: Record<string, unknown> = {
    ...(form.breed.trim() ? { breed: form.breed.trim().toLowerCase() } : {}),
    ...(ageYears !== undefined ? { age_years: ageYears } : {}),
    ...(weightKg !== undefined ? { weight_kg: weightKg } : {}),
    ...(sex ? { sex } : {}),
    ...(form.activityLevel ? { activity_level: form.activityLevel.toLowerCase() } : {}),
    ...(foodSpendMonthly !== undefined ? { current_food_spend_monthly: foodSpendMonthly } : {}),
  };
  const diet: Record<string, unknown> = {
    ...(form.dietType ? { type: form.dietType === "Cooked" ? "cooked" : "raw" } : {}),
    ...(form.goal ? { goal: goalSlugById[form.goal]?.toLowerCase() ?? form.goal.toLowerCase() } : {}),
    ...(mergedAllergens.length ? { allergens: mergedAllergens } : {}),
    ...(form.otherAvoid.trim() ? { other_exclusions: form.otherAvoid.trim().toLowerCase() } : {}),
  };
  const health: Record<string, unknown> = {
    conditions: selectedConditions,
    ...(selectedConditions.includes("kidney_disease") && form.kidneyStage ? { kidney_stage: form.kidneyStage.toLowerCase() } : {}),
    ...(selectedConditions.includes("diabetes") && form.diabetesInsulinDependent ? { insulin_dependent: form.diabetesInsulinDependent.toLowerCase() } : {}),
    ...(selectedConditions.includes("heart_disease") && form.heartMedication ? { cardiac_medication: form.heartMedication.toLowerCase() } : {}),
    ...(selectedConditions.includes("overweight") && toNumberOrUndefined(form.overweightTargetWeightKg) !== undefined ? { overweight_target_weight_kg: toNumberOrUndefined(form.overweightTargetWeightKg) } : {}),
    ...(selectedConditions.includes("joint_issues") && form.jointSupplementsTaking === "yes" && form.jointSupplementsText.trim() ? { joint_supplements: form.jointSupplementsText.trim().toLowerCase() } : {}),
    ...(selectedConditions.includes("sensitive_stomach") && form.sensitiveStomachTriggers.trim() ? { trigger_foods: form.sensitiveStomachTriggers.trim().toLowerCase() } : {}),
    ...(selectedConditions.includes("cancer") && form.cancerType.trim() ? { cancer_type: form.cancerType.trim().toLowerCase() } : {}),
    ...(form.notes.trim() ? { notes: form.notes.trim().toLowerCase() } : {}),
  };
  return { dog_name: form.dogName.trim().toLowerCase(), dog, diet, health };
}

// ─── Main component ───────────────────────────────────────────────────────────

function OnboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dogId = searchParams.get("dog_id");
  const isEditMode = searchParams.get("mode") === "edit";

  // Auth / login state (resolved after mount)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(!process.env.NEXT_PUBLIC_SUPABASE_URL);
  const [userId, setUserId] = useState<string | null>(null);

  // Step state
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [agentPayload, setAgentPayload] = useState<Record<string, unknown> | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<Record<string, unknown> | null>(null);
  const [isRegenMode, setIsRegenMode] = useState(false);
  const [isKitchenOnlyMode, setIsKitchenOnlyMode] = useState(false);

  // Dog profile form
  const [form, setForm] = useState<FormState>({
    dogName: "", breed: "", age: "", weight: "", weightUnit: "kg", sex: "",
    foodSpendMonthly: "",
    healthConditions: [], kidneyStage: "", diabetesInsulinDependent: "",
    vetConfirmedAllergens: "", overweightTargetWeightKg: "", heartMedication: "",
    jointSupplementsTaking: "", jointSupplementsText: "", sensitiveStomachTriggers: "",
    cancerType: "", activityLevel: "", dietType: "Cooked", allergens: [], otherAvoid: "",
    goal: "", notes: "",
  });

  // Pantry state (step 6)
  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>(() =>
    DEFAULT_INGREDIENTS.map((i) => ({ name: i.name, unit: i.unit, isAvailable: false, quantity: "", isRunningLow: false }))
  );
  const [supplementRows, setSupplementRows] = useState<IngredientRow[]>(() =>
    DEFAULT_SUPPLEMENTS.map((s) => ({ name: s.name, unit: s.unit, isAvailable: false, quantity: "", isRunningLow: false }))
  );
  const [equipmentRows, setEquipmentRows] = useState<EquipmentRow[]>(() =>
    DEFAULT_EQUIPMENT.map((e) => ({ name: e.name, isAvailable: false }))
  );
  const [customIngredients, setCustomIngredients] = useState<IngredientRow[]>([]);
  const [customSupplements, setCustomSupplements] = useState<IngredientRow[]>([]);
  const [pantryLastUpdated, setPantryLastUpdated] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState({
    ingredients: true, supplements: false, equipment: false,
  });

  const totalSteps = isEditMode ? 5 : (isLoggedIn ? 6 : 5);
  const noneSelected = form.healthConditions.includes("None / Healthy");

  // ─── Auth check + pantry pre-fill ──────────────────────────────────────────
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    let cancelled = false;

    async function checkAuth() {
      try {
        const supabase = createClient();
        const { data: { user } } = await withTimeout(
          supabase.auth.getUser(),
          5000,
          "Auth check timed out",
        );
        if (cancelled) return;

        if (user) {
          setIsLoggedIn(true);
          setUserId(user.id);

          // When dog_id is present, load the saved profile and skip the wizard
          if (dogId) {
            try {
              const { data: dr } = await supabase
                .from("dogs")
                .select("name, breed, age_years, weight_kg, sex, goal, diet_type, health_conditions, allergens, other_exclusions, activity_level, current_food_spend_monthly")
                .eq("id", dogId)
                .eq("user_id", user.id)
                .single();
              if (dr && !cancelled) {
                const rec = dr as DogRecord;
                setForm((prev) => ({
                  ...prev,
                  dogName: rec.name ? rec.name.charAt(0).toUpperCase() + rec.name.slice(1) : "",
                  breed: rec.breed
                    ? rec.breed.replace(/\b\w/g, (c: string) => c.toUpperCase())
                    : "",
                  age: rec.age_years != null ? String(rec.age_years) : "",
                  weight: rec.weight_kg != null ? String(rec.weight_kg) : "",
                  weightUnit: "kg" as const,
                  sex: (rec.sex ?? "") as FormState["sex"],
                  activityLevel: rec.activity_level ?? "",
                  dietType: rec.diet_type === "raw" ? ("Raw (BARF)" as const) : ("Cooked" as const),
                  goal: DB_GOAL_TO_FORM[rec.goal ?? ""] ?? "",
                  healthConditions: ((rec.health_conditions ?? []) as string[])
                    .map((c) => DB_CONDITION_TO_LABEL[c])
                    .filter(Boolean),
                  allergens: ((rec.allergens ?? []) as string[]).map(
                    (a) => a.charAt(0).toUpperCase() + a.slice(1),
                  ),
                  otherAvoid: rec.other_exclusions ?? "",
                  foodSpendMonthly:
                    rec.current_food_spend_monthly != null
                      ? String(rec.current_food_spend_monthly)
                      : "",
                }));
                setAgentPayload(buildPayloadFromRecord(rec));
                if (!isEditMode) setIsRegenMode(true);
              }
            } catch {
              // Dog fetch failed — fall through to normal wizard
            }
          }

          // Pre-fill pantry from DB
          void supabase
            .from("pantry_items")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true })
            .then(({ data }) => {
              if (!data || data.length === 0) return;
              // Find latest updated timestamp
              const latestTs = data.reduce((latest: string, item: Record<string, unknown>) => {
                const t = (item.last_updated as string) ?? "";
                return t > latest ? t : latest;
              }, "");
              if (latestTs) setPantryLastUpdated(latestTs);

            const dbMap = new Map<string, Record<string, unknown>>(
              data.map((d: Record<string, unknown>) => [d.name as string, d])
            );
            setIngredientRows((prev) =>
              prev.map((row) => {
                const db = dbMap.get(row.name);
                if (!db) return row;
                return {
                  ...row,
                  isAvailable: db.is_available as boolean,
                  quantity: db.quantity != null ? String(db.quantity) : "",
                  isRunningLow: db.is_running_low as boolean,
                };
              })
            );
            setSupplementRows((prev) =>
              prev.map((row) => {
                const db = dbMap.get(row.name);
                if (!db) return row;
                return {
                  ...row,
                  isAvailable: db.is_available as boolean,
                  quantity: db.quantity != null ? String(db.quantity) : "",
                  isRunningLow: db.is_running_low as boolean,
                };
              })
            );
            setEquipmentRows((prev) =>
              prev.map((row) => {
                const db = dbMap.get(row.name);
                if (!db) return row;
                return { ...row, isAvailable: db.is_available as boolean };
              })
            );
            // Restore any custom items saved in DB that aren't in defaults
            const defaultNames = new Set([
              ...DEFAULT_INGREDIENTS.map((d) => d.name),
              ...DEFAULT_SUPPLEMENTS.map((d) => d.name),
              ...DEFAULT_EQUIPMENT.map((d) => d.name),
            ]);
            const extraIngredients = data.filter(
              (d: Record<string, unknown>) => d.type === "ingredient" && !defaultNames.has(d.name as string)
            );
            const extraSupplements = data.filter(
              (d: Record<string, unknown>) => d.type === "supplement" && !defaultNames.has(d.name as string)
            );
            if (extraIngredients.length > 0) {
              setCustomIngredients(extraIngredients.map((d: Record<string, unknown>) => ({
                name: d.name as string,
                unit: (d.unit as string) ?? "g",
                isAvailable: d.is_available as boolean,
                quantity: d.quantity != null ? String(d.quantity) : "",
                isRunningLow: d.is_running_low as boolean,
              })));
            }
            if (extraSupplements.length > 0) {
              setCustomSupplements(extraSupplements.map((d: Record<string, unknown>) => ({
                name: d.name as string,
                unit: (d.unit as string) ?? "count",
                isAvailable: d.is_available as boolean,
                quantity: d.quantity != null ? String(d.quantity) : "",
                isRunningLow: d.is_running_low as boolean,
              })));
            }
            });
        }
        setAuthChecked(true);
      } catch {
        if (!cancelled) setAuthChecked(true);
      }
    }

    void checkAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Navigation helpers ───────────────────────────────────────────────────

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
    if (step === 2) return form.healthConditions.length > 0 && form.activityLevel.length > 0;
    if (step === 3) return true;
    if (step === 4) return form.goal.length > 0;
    if (step === 5) return isLoggedIn; // logged-in users can proceed to step 6
    return false;
  }, [form, step, isLoggedIn]);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const toggleHealthCondition = (item: string) => {
    setForm((current) => {
      if (item === "None / Healthy") return { ...current, healthConditions: ["None / Healthy"] };
      const withoutNone = current.healthConditions.filter((c) => c !== "None / Healthy");
      const exists = withoutNone.includes(item);
      return {
        ...current,
        healthConditions: exists ? withoutNone.filter((c) => c !== item) : [...withoutNone, item],
      };
    });
  };

  const toggleAllergen = (item: string) => {
    setForm((current) => {
      const exists = current.allergens.includes(item);
      return {
        ...current,
        allergens: exists ? current.allergens.filter((e) => e !== item) : [...current.allergens, item],
      };
    });
  };

  const goBack = () => {
    if (step === 1) { router.push(dogId ? `/dogs/${dogId}` : "/"); return; }
    setStep((s) => s - 1);
  };

  const goNext = () => {
    if (!canGoNext || step >= totalSteps) return;
    if (step === 4) setAgentPayload(buildAgentPayload(form));
    setStep((s) => s + 1);
  };

  // ─── Pantry helpers ───────────────────────────────────────────────────────

  const updateIngredient = useCallback((index: number, isCustom: boolean, updated: IngredientRow) => {
    if (isCustom) {
      setCustomIngredients((prev) => prev.map((r, i) => (i === index ? updated : r)));
    } else {
      setIngredientRows((prev) => prev.map((r, i) => (i === index ? updated : r)));
    }
  }, []);

  const updateSupplement = useCallback((index: number, isCustom: boolean, updated: IngredientRow) => {
    if (isCustom) {
      setCustomSupplements((prev) => prev.map((r, i) => (i === index ? updated : r)));
    } else {
      setSupplementRows((prev) => prev.map((r, i) => (i === index ? updated : r)));
    }
  }, []);

  const updateEquipment = useCallback((index: number, updated: EquipmentRow) => {
    setEquipmentRows((prev) => prev.map((r, i) => (i === index ? updated : r)));
  }, []);

  const addCustomIngredient = () => {
    setCustomIngredients((prev) => [...prev, { name: "", unit: "g", isAvailable: true, quantity: "", isRunningLow: false }]);
  };

  const addCustomSupplement = () => {
    setCustomSupplements((prev) => [...prev, { name: "", unit: "count", isAvailable: true, quantity: "", isRunningLow: false }]);
  };

  const toggleSection = (section: "ingredients" | "supplements" | "equipment") => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // ─── Generation ────────────────────────────────────────────────────────────

  const proceedWithGeneration = (payload: Record<string, unknown>) => {
    try {
      window.localStorage.setItem("recipup_dog_profile", JSON.stringify(payload));
    } catch {
      // ignore
    }
    setIsGenerating(true);
    setTimeout(() => router.push("/recipes"), 1400);
  };

  const saveDogToSupabase = async (
    supabase: ReturnType<typeof createClient>,
    uid: string,
    payload: Record<string, unknown>,
  ) => {
    const p = payload as {
      dog_name?: string;
      dog?: { breed?: string; age_years?: number; weight_kg?: number; sex?: string; activity_level?: string };
      diet?: { type?: string; goal?: string; allergens?: string[]; other_exclusions?: string };
      health?: { conditions?: string[]; [key: string]: unknown };
    };
    const dogData = {
      user_id: uid,
      name: p.dog_name ?? form.dogName,
      breed: p.dog?.breed ?? null,
      age_years: p.dog?.age_years ?? null,
      weight_kg: p.dog?.weight_kg ?? null,
      sex: p.dog?.sex ?? null,
      activity_level: p.dog?.activity_level ?? null,
      diet_type: p.diet?.type ?? null,
      goal: p.diet?.goal ?? null,
      health_conditions: p.health?.conditions ?? [],
      allergens: p.diet?.allergens ?? [],
      other_exclusions: p.diet?.other_exclusions ?? null,
      current_food_spend_monthly: (p.dog as Record<string, unknown> | undefined)?.current_food_spend_monthly ?? null,
      is_active: true,
    };
    if (dogId) {
      await supabase.from("dogs").update(dogData).eq("id", dogId).eq("user_id", uid);
    } else {
      await supabase.from("dogs").insert(dogData);
    }
  };

  // Called from step 5 (logged-out only) or modal continue
  const generateRecipes = async () => {
    if (isGenerating) return;
    const payload = agentPayload ?? buildAgentPayload(form);
    setAgentPayload(payload);

    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      let user: { id: string } | null = null;
      let supabase: ReturnType<typeof createClient> | null = null;
      try {
        supabase = createClient();
        const result = await withTimeout(
          supabase.auth.getUser(),
          5000,
          "Auth check timed out",
        );
        user = result.data.user;
      } catch {
        user = null;
      }

      if (!user || !supabase) {
        try {
          window.localStorage.setItem("recipup_pending_dog_profile", JSON.stringify(payload));
        } catch { /* ignore */ }
        setPendingPayload(payload);
        setShowSaveModal(true);
        return;
      }
      try { await saveDogToSupabase(supabase, user.id, payload); } catch { /* non-fatal */ }
    }
    proceedWithGeneration(payload);
  };

  // Called from step 6 (logged-in only) — saves pantry too
  const generateWithPantry = async () => {
    if (isGenerating) return;
    const payload = agentPayload ?? buildAgentPayload(form);
    setAgentPayload(payload);

    const allIngredients = [...ingredientRows, ...customIngredients].filter((r) => r.name.trim());
    const allSupplements = [...supplementRows, ...customSupplements].filter((r) => r.name.trim());

    const pantryItemsToSave = [
      ...allIngredients.map((r) => ({
        type: "ingredient" as const,
        name: r.name,
        quantity: r.quantity ? parseFloat(r.quantity) : null,
        unit: r.unit,
        is_available: r.isAvailable,
        is_running_low: r.isRunningLow,
      })),
      ...allSupplements.map((r) => ({
        type: "supplement" as const,
        name: r.name,
        quantity: r.quantity ? parseFloat(r.quantity) : null,
        unit: r.unit,
        is_available: r.isAvailable,
        is_running_low: r.isRunningLow,
      })),
      ...equipmentRows.map((r) => ({
        type: "equipment" as const,
        name: r.name,
        quantity: null,
        unit: null,
        is_available: r.isAvailable,
        is_running_low: false,
      })),
    ];

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && userId) {
      const supabase = createClient();
      try { await saveDogToSupabase(supabase, userId, payload); } catch { /* non-fatal */ }
      try { await savePantryItems(supabase, userId, pantryItemsToSave); } catch { /* non-fatal */ }
    }

    // Build pantry prompt and save to localStorage for recipes page
    const pantryForPrompt: Pantry = {
      ingredients: allIngredients.map((r) => ({
        type: "ingredient",
        name: r.name,
        quantity: r.quantity ? parseFloat(r.quantity) : null,
        unit: r.unit,
        is_available: r.isAvailable,
        is_running_low: r.isRunningLow,
      })),
      supplements: allSupplements.map((r) => ({
        type: "supplement",
        name: r.name,
        quantity: r.quantity ? parseFloat(r.quantity) : null,
        unit: r.unit,
        is_available: r.isAvailable,
        is_running_low: r.isRunningLow,
      })),
      equipment: equipmentRows.map((r) => ({
        type: "equipment",
        name: r.name,
        quantity: null,
        unit: null,
        is_available: r.isAvailable,
        is_running_low: false,
      })),
      lastUpdated: null,
    };

    try {
      window.localStorage.setItem("recipup_pantry_context", buildPantryPrompt(pantryForPrompt));
      const unavailable = equipmentRows.filter((r) => !r.isAvailable).map((r) => r.name);
      window.localStorage.setItem("recipup_unavailable_equipment", JSON.stringify(unavailable));
    } catch { /* ignore */ }

    proceedWithGeneration(payload);
  };

  // Saves profile only (edit mode) — no recipe generation
  const saveProfileOnly = async () => {
    const payload = agentPayload ?? buildAgentPayload(form);
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && userId && dogId) {
      const supabase = createClient();
      try { await saveDogToSupabase(supabase, userId, payload); } catch { /* non-fatal */ }
    }
    router.push(`/dogs/${dogId}`);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!authChecked) {
    // Tiny loading state while we resolve auth (prevents flash of wrong step count)
    return <div className="flex min-h-screen items-center justify-center" />;
  }

  // Regen mode: dog_id was present and profile loaded — skip the full wizard
  if (isRegenMode) {
    const displayName = form.dogName || "your dog";
    const profileLine = [
      form.breed,
      form.age ? `${form.age}y` : null,
      form.weight ? `${form.weight}kg` : null,
      form.activityLevel ? `${form.activityLevel} activity` : null,
      form.goal ? (GOALS.find((g) => g.id === form.goal)?.title ?? null) : null,
    ]
      .filter(Boolean)
      .join(" · ");
    const healthLine =
      form.healthConditions.length > 0 && !form.healthConditions.includes("None / Healthy")
        ? form.healthConditions.join(", ")
        : null;

    return (
      <div className="mx-auto w-full max-w-4xl px-6 py-10 md:px-10 md:py-14">
        <div className="rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-sand)] p-8 md:p-10">
          <p className="text-[0.65rem] font-semibold text-[var(--color-sage)] uppercase tracking-widest mb-5">
            Ready to cook
          </p>
          <h1 className="font-heading text-3xl text-[var(--color-ink)]">
            Fresh batch for {displayName}
          </h1>
          {profileLine && (
            <p className="mt-2 text-sm text-[var(--color-ink-500)]">{profileLine}</p>
          )}
          {healthLine && (
            <p className="mt-1 text-sm text-[var(--color-ink-500)]">{healthLine}</p>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={generateWithPantry}
              disabled={isGenerating}
              className={`rounded-full bg-[var(--color-coral)] px-7 py-3 text-sm font-semibold text-[var(--color-warm-white)] ${
                isGenerating ? "animate-pulse" : "transition-transform hover:-translate-y-0.5"
              }`}
            >
              {isGenerating ? `Building ${displayName}'s recipes...` : "Generate now →"}
            </button>
            <button
              type="button"
              onClick={() => { setIsRegenMode(false); setIsKitchenOnlyMode(true); setStep(6); }}
              className="rounded-full border border-[var(--color-sand-deep)] px-7 py-3 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-sand-deep)] transition-colors"
            >
              Update what&apos;s in the kitchen →
            </button>
          </div>

          <button
            type="button"
            onClick={() => { setIsRegenMode(false); setStep(1); }}
            className="mt-6 block text-sm text-[var(--color-ink-500)] hover:text-[var(--color-coral)] transition-colors"
          >
            Edit {displayName}&apos;s profile
          </button>
        </div>
      </div>
    );
  }

  const generateButtonLabel = isGenerating
    ? `Building ${form.dogName}'s recipe plan...`
    : pantryLastUpdated
      ? "Confirm & generate →"
      : "Looks good, generate my recipes →";

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10 md:px-10 md:py-14">
      {/* Save modal (logged-out users) */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 px-4">
          <div className="w-full max-w-md rounded-3xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-8 shadow-xl">
            <h2 className="font-heading text-2xl text-[var(--color-ink)]">Save your recipes?</h2>
            <p className="mt-3 text-[var(--color-ink-500)]">
              Create a free account to generate recipes, keep your dog&apos;s profile, and access everything again later.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => router.push("/signup")}
                className="rounded-full bg-[var(--color-coral)] px-6 py-3 text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
              >
                Create free account
              </button>
              {pendingPayload && (
                <p className="text-center text-xs text-[var(--color-ink-500)]">
                  We&apos;ll keep this dog profile on this device while you create the account.
                </p>
              )}
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="text-center text-sm text-[var(--color-ink-500)] hover:text-[var(--color-ink)]"
              >
                Not now — I&apos;ll sign up later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {isKitchenOnlyMode ? (
        <div className="mb-8">
          <p className="text-sm text-[var(--color-ink-500)]">Updating your kitchen</p>
          <div className="mt-3 h-2 w-full rounded-full border border-[var(--color-coral)] bg-[var(--color-coral)]" />
        </div>
      ) : (
        <div className="mb-8">
          <p className="text-sm text-[var(--color-ink-500)]">
            Step {step} of {totalSteps}
          </p>
          <div className={`mt-3 grid gap-2`} style={{ gridTemplateColumns: `repeat(${totalSteps}, 1fr)` }}>
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full border ${
                  index < step
                    ? "border-[var(--color-coral)] bg-[var(--color-coral)]"
                    : "border-[var(--color-sand-deep)] bg-[var(--color-sand)]"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Step content */}
      <section className="rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-sand)] p-6 md:p-8">

        {/* ── Step 1: Meet your dog ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="font-heading text-4xl text-[var(--color-ink)]">Meet your dog</h1>
              <p className="mt-1 text-[var(--color-ink-500)]">Tell us who they are — we&apos;ll handle the rest.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-[var(--color-ink-500)]">Dog&apos;s name</span>
                <input
                  value={form.dogName}
                  onChange={(e) => updateForm("dogName", e.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] px-4 outline-none focus:border-[var(--color-coral)]"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-[var(--color-ink-500)]">Breed</span>
                <input
                  list="breed-options"
                  value={form.breed}
                  onChange={(e) => updateForm("breed", e.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] px-4 outline-none focus:border-[var(--color-coral)]"
                />
                <datalist id="breed-options">{BREEDS.map((b) => <option key={b} value={b} />)}</datalist>
              </label>
              <label className="space-y-2">
                <span className="text-sm text-[var(--color-ink-500)]">Age (years)</span>
                <input
                  type="number" min={0} value={form.age}
                  onChange={(e) => updateForm("age", e.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] px-4 outline-none focus:border-[var(--color-coral)]"
                />
                <p className="text-xs text-[var(--color-ink-500)]">Works for all ages — from puppies to seniors</p>
              </label>
              <div className="space-y-2">
                <span className="text-sm text-[var(--color-ink-500)]">Weight</span>
                <div className="flex gap-2">
                  <input
                    type="number" min={0} value={form.weight}
                    onChange={(e) => updateForm("weight", e.target.value)}
                    className="h-11 w-full rounded-xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] px-4 outline-none focus:border-[var(--color-coral)]"
                  />
                  <div className="inline-flex rounded-xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-1">
                    {(["kg", "lbs"] as const).map((unit) => (
                      <button
                        key={unit} type="button" onClick={() => updateForm("weightUnit", unit)}
                        className={`rounded-lg px-3 py-1 text-sm ${form.weightUnit === unit ? "bg-[var(--color-coral)] text-[var(--color-warm-white)]" : "text-[var(--color-ink-500)]"}`}
                      >{unit}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-sm text-[var(--color-ink-500)]">Monthly food spend (optional)</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--color-ink-500)]">£/€</span>
                  <input
                    type="number"
                    min={0}
                    value={form.foodSpendMonthly}
                    onChange={(e) => updateForm("foodSpendMonthly", e.target.value)}
                    placeholder="e.g. 65"
                    className="h-11 w-full rounded-xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] px-4 outline-none focus:border-[var(--color-coral)]"
                  />
                </div>
                <p className="text-xs text-[var(--color-ink-500)]">Tell us what you currently spend — we&apos;ll try to beat it.</p>
              </div>
              <div className="space-y-2">
                <span className="text-sm text-[var(--color-ink-500)]">Sex</span>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: "male_intact", label: "Male (intact)" },
                    { value: "female_intact", label: "Female (intact)" },
                    { value: "male_neutered", label: "Male (neutered)" },
                    { value: "female_spayed", label: "Female (spayed)" },
                  ] as const).map(({ value, label }) => (
                    <button
                      key={value} type="button" onClick={() => updateForm("sex", value)}
                      className={`rounded-xl border px-4 py-2.5 text-sm transition-colors ${form.sex === value ? "border-[var(--color-coral)] bg-[var(--color-coral)] text-[var(--color-warm-white)]" : "border-[var(--color-sand-deep)] text-[var(--color-ink-500)] hover:border-[var(--color-coral)]"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[var(--color-ink-500)]">Neutered and spayed dogs need slightly fewer calories — we adjust the recipes automatically.</p>
              </div>
            </div>
            {isEditMode && dogId && (
              <div className="border-t border-[var(--color-sand-deep)] pt-4">
                <button
                  type="button"
                  onClick={() => router.push(`/dogs/${dogId}/delete`)}
                  className="text-sm text-[var(--color-ink-300)] hover:text-[var(--color-ink-500)] transition-colors"
                >
                  Delete {form.dogName ? `${form.dogName}'s profile` : "this profile"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Health profile ── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="font-heading text-4xl text-[var(--color-ink)]">Their health profile</h1>
              <p className="mt-1 text-[var(--color-ink-500)]">Every dog is different. The more you tell us, the better we can tailor their recipes.</p>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-ink-500)]">Any health conditions?</p>
              <div className="flex flex-wrap gap-2">
                {HEALTH_OPTIONS.map((condition) => {
                  const selected = form.healthConditions.includes(condition);
                  return (
                    <button
                      key={condition} type="button" onClick={() => toggleHealthCondition(condition)}
                      className={`rounded-full border px-4 py-2 text-sm transition-colors ${selected ? "border-[var(--color-coral)] bg-[var(--color-coral)] text-[var(--color-warm-white)]" : "border-[var(--color-sand-deep)] text-[var(--color-ink-500)]"}`}
                    >{condition}</button>
                  );
                })}
              </div>
              {!noneSelected && (
                <div className="mt-6 space-y-4">
                  {form.healthConditions.includes("Kidney Disease") && (
                    <DetailBlock title="What stage has your vet diagnosed?">
                      <SingleSelectChips options={KIDNEY_STAGES} value={form.kidneyStage} onChange={(v) => updateForm("kidneyStage", v)} />
                    </DetailBlock>
                  )}
                  {form.healthConditions.includes("Diabetes") && (
                    <DetailBlock title="Is your dog insulin-dependent?">
                      <SingleSelectChips options={INSULIN_OPTIONS} value={form.diabetesInsulinDependent} onChange={(v) => updateForm("diabetesInsulinDependent", v)} />
                    </DetailBlock>
                  )}
                  {form.healthConditions.includes("Allergies") && (
                    <DetailBlock title="Which allergens has your vet confirmed?">
                      <input value={form.vetConfirmedAllergens} onChange={(e) => updateForm("vetConfirmedAllergens", e.target.value)} className="h-11 w-full rounded-xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] px-4 outline-none focus:border-[var(--color-coral)]" />
                    </DetailBlock>
                  )}
                  {form.healthConditions.includes("Overweight") && (
                    <DetailBlock title="Has your vet given a target weight? (optional)">
                      <input type="number" min={0} value={form.overweightTargetWeightKg} onChange={(e) => updateForm("overweightTargetWeightKg", e.target.value)} className="h-11 w-full rounded-xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] px-4 outline-none focus:border-[var(--color-coral)]" />
                    </DetailBlock>
                  )}
                  {form.healthConditions.includes("Heart Disease") && (
                    <DetailBlock title="Is your dog on cardiac medication?">
                      <SingleSelectChips options={CARDIAC_OPTIONS} value={form.heartMedication} onChange={(v) => updateForm("heartMedication", v)} />
                    </DetailBlock>
                  )}
                  {form.healthConditions.includes("Joint Issues") && (
                    <DetailBlock title="Is your dog currently taking any joint supplements?">
                      <div className="flex flex-wrap gap-2">
                        {(["yes", "no"] as const).map((option) => (
                          <button key={option} type="button" onClick={() => updateForm("jointSupplementsTaking", option)}
                            className={`rounded-full border px-4 py-2 text-sm transition-colors ${form.jointSupplementsTaking === option ? "border-[var(--color-coral)] bg-[var(--color-coral)] text-[var(--color-warm-white)]" : "border-[var(--color-sand-deep)] text-[var(--color-ink-500)]"}`}
                          >{option === "yes" ? "Yes" : "No"}</button>
                        ))}
                      </div>
                      {form.jointSupplementsTaking === "yes" && (
                        <div className="mt-4">
                          <p className="text-sm text-[var(--color-ink-500)]">Which supplements?</p>
                          <input value={form.jointSupplementsText} onChange={(e) => updateForm("jointSupplementsText", e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] px-4 outline-none focus:border-[var(--color-coral)]" />
                        </div>
                      )}
                    </DetailBlock>
                  )}
                  {form.healthConditions.includes("Sensitive Stomach") && (
                    <DetailBlock title="Any known trigger foods? (optional)">
                      <textarea value={form.sensitiveStomachTriggers} onChange={(e) => updateForm("sensitiveStomachTriggers", e.target.value)} className="min-h-24 w-full resize-none rounded-xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-4 outline-none focus:border-[var(--color-coral)]" />
                    </DetailBlock>
                  )}
                  {form.healthConditions.includes("Cancer") && (
                    <DetailBlock title="Type of cancer if known (optional)">
                      <input value={form.cancerType} onChange={(e) => updateForm("cancerType", e.target.value)} className="h-11 w-full rounded-xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] px-4 outline-none focus:border-[var(--color-coral)]" />
                    </DetailBlock>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-ink-500)]">How active are they?</p>
              <div className="grid gap-3 md:grid-cols-2">
                {ACTIVITY_LEVELS.map((level) => {
                  const selected = form.activityLevel === level.id;
                  return (
                    <button key={level.id} type="button" onClick={() => updateForm("activityLevel", level.id)}
                      className={`rounded-2xl border p-4 text-left transition-colors ${selected ? "border-[var(--color-coral)] bg-[var(--color-coral)]" : "border-[var(--color-sand-deep)] bg-transparent"}`}
                    >
                      <p className={`text-xl ${selected ? "text-[var(--color-warm-white)]" : ""}`}>{level.emoji}</p>
                      <p className={`mt-2 font-semibold ${selected ? "text-[var(--color-warm-white)]" : "text-[var(--color-ink)]"}`}>{level.title}</p>
                      <p className={`text-sm ${selected ? "text-[var(--color-warm-white)]/90" : "text-[var(--color-ink-500)]"}`}>{level.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Diet & sensitivities ── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="font-heading text-4xl text-[var(--color-ink)]">Diet and sensitivities</h1>
              <p className="mt-1 text-[var(--color-ink-500)]">We&apos;ll make sure nothing goes in the bowl that shouldn&apos;t be there.</p>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-ink-500)]">Cooking style</p>
              <div className="inline-flex rounded-full border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-1">
                {(["Cooked", "Raw (BARF)"] as const).map((diet) => (
                  <button key={diet} type="button" onClick={() => updateForm("dietType", diet)}
                    className={`rounded-full px-5 py-2 text-sm transition-colors ${form.dietType === diet ? "bg-[var(--color-coral)] text-[var(--color-warm-white)]" : "text-[var(--color-ink-500)]"}`}
                  >{diet}</button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-ink-500)]">Ingredients to avoid</p>
              <p className="text-xs text-[var(--color-ink-500)]">We&apos;ll never include these in any recipe.</p>
              <div className="flex flex-wrap gap-2">
                {ALLERGENS.map((allergen) => {
                  const selected = form.allergens.includes(allergen);
                  return (
                    <button key={allergen} type="button" onClick={() => toggleAllergen(allergen)}
                      className={`rounded-full border px-4 py-2 text-sm transition-colors ${selected ? "border-[var(--color-coral)] bg-[var(--color-coral)] text-[var(--color-warm-white)]" : "border-[var(--color-sand-deep)] text-[var(--color-ink-500)]"}`}
                    >{allergen}</button>
                  );
                })}
              </div>
            </div>
            <label className="space-y-2">
              <span className="text-sm text-[var(--color-ink-500)]">Anything else to exclude?</span>
              <textarea value={form.otherAvoid} onChange={(e) => updateForm("otherAvoid", e.target.value)} placeholder="e.g. peanuts, sweet potato..." className="min-h-28 w-full resize-none rounded-xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-4 outline-none focus:border-[var(--color-coral)]" />
            </label>
          </div>
        )}

        {/* ── Step 4: Goals ── */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h1 className="font-heading text-4xl text-[var(--color-ink)]">What&apos;s the goal?</h1>
              <p className="mt-1 text-[var(--color-ink-500)]">What would you like to achieve with home cooking?</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {GOALS.map((goal) => {
                const selected = form.goal === goal.id;
                return (
                  <button key={goal.id} type="button" onClick={() => updateForm("goal", goal.id)}
                    className={`rounded-2xl border p-4 text-left transition-colors ${selected ? "border-[var(--color-coral)] bg-[var(--color-coral)]" : "border-[var(--color-sand-deep)] bg-transparent"}`}
                  >
                    <p className={`text-xl ${selected ? "text-[var(--color-warm-white)]" : "text-[var(--color-ink)]"}`}>{goal.emoji}</p>
                    <p className={`mt-2 font-semibold ${selected ? "text-[var(--color-warm-white)]" : "text-[var(--color-ink)]"}`}>{goal.title}</p>
                    <p className={`text-sm ${selected ? "text-[var(--color-warm-white)]/90" : "text-[var(--color-ink-500)]"}`}>{goal.description}</p>
                  </button>
                );
              })}
            </div>
            <label className="space-y-2">
              <span className="text-sm text-[var(--color-ink-500)]">Anything else we should know about them?</span>
              <textarea value={form.notes} onChange={(e) => updateForm("notes", e.target.value)} placeholder="Any extra context that might help us get the recipes right..." className="min-h-28 w-full resize-none rounded-xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-4 outline-none focus:border-[var(--color-coral)]" />
            </label>
          </div>
        )}

        {/* ── Step 5: Summary ── */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-6">
              <h1 className="font-heading text-3xl text-[var(--color-ink)]">{form.dogName}&apos;s plan is ready to build.</h1>
              <p className="mt-2 text-sm text-[var(--color-ink-500)]">Check everything looks right, then we&apos;ll get cooking.</p>
              <div className="mt-5 text-sm">
                <SummaryRow label="Breed" value={form.breed} />
                <SummaryRow label="Age" value={`${form.age} years`} />
                <SummaryRow label="Weight" value={`${form.weight} ${form.weightUnit}`} />
                <SummaryRow label="Sex" value={{ male_intact: "Male", female_intact: "Female", male_neutered: "Neutered male", female_spayed: "Spayed female", "": "" }[form.sex]} />
                <SummaryRow label="Health conditions" value={form.healthConditions.join(", ")} />
                <SummaryRow label="Activity level" value={ACTIVITY_LEVELS.find((l) => l.id === form.activityLevel)?.title ?? ""} />
                <SummaryRow label="Diet type" value={form.dietType} />
                <SummaryRow label="Goal" value={GOALS.find((g) => g.id === form.goal)?.title ?? ""} />
                <SummaryRow label="Allergens" value={form.allergens.length ? form.allergens.join(", ") : ""} />
                {form.healthConditions.includes("Kidney Disease") && (
                  <SummaryRow label="Kidney stage" value={KIDNEY_STAGES.find((s) => s.id === form.kidneyStage)?.label ?? ""} />
                )}
                {form.healthConditions.includes("Diabetes") && (
                  <SummaryRow label="Insulin-dependent?" value={INSULIN_OPTIONS.find((o) => o.id === form.diabetesInsulinDependent)?.label ?? ""} />
                )}
                {form.healthConditions.includes("Allergies") && (
                  <SummaryRow label="Vet-confirmed allergens" value={form.vetConfirmedAllergens.trim()} />
                )}
                {form.healthConditions.includes("Overweight") && form.overweightTargetWeightKg.trim() && (
                  <SummaryRow label="Target weight (kg)" value={form.overweightTargetWeightKg.trim()} />
                )}
                {form.healthConditions.includes("Heart Disease") && (
                  <SummaryRow label="On cardiac medication?" value={CARDIAC_OPTIONS.find((o) => o.id === form.heartMedication)?.label ?? ""} />
                )}
                {form.healthConditions.includes("Joint Issues") && (
                  <>
                    <SummaryRow label="Taking joint supplements?" value={form.jointSupplementsTaking === "yes" ? "Yes" : form.jointSupplementsTaking === "no" ? "No" : ""} />
                    {form.jointSupplementsTaking === "yes" && form.jointSupplementsText.trim() && (
                      <SummaryRow label="Supplements" value={form.jointSupplementsText.trim()} />
                    )}
                  </>
                )}
                {form.healthConditions.includes("Sensitive Stomach") && form.sensitiveStomachTriggers.trim() && (
                  <SummaryRow label="Trigger foods" value={form.sensitiveStomachTriggers.trim()} />
                )}
                {form.healthConditions.includes("Cancer") && form.cancerType.trim() && (
                  <SummaryRow label="Cancer type" value={form.cancerType.trim()} />
                )}
                <SummaryRow label="Other ingredients to avoid" value={form.otherAvoid.trim()} />
                <SummaryRow label="Additional notes" value={form.notes.trim()} />
              </div>
            </div>

            {/* Only logged-out users get the generate button here */}
            {!isLoggedIn && (
              <>
                <button
                  type="button"
                  onClick={generateRecipes}
                  disabled={isGenerating}
                  className={`rounded-full bg-[var(--color-coral)] px-7 py-3 text-sm font-semibold text-[var(--color-warm-white)] ${isGenerating ? "animate-pulse" : "transition-transform hover:-translate-y-0.5"}`}
                >
                  {isGenerating ? `Building ${form.dogName}'s recipe plan...` : `Generate ${form.dogName}'s recipes →`}
                </button>
                <p className="text-xs text-[var(--color-ink-500)]">
                  Recipup recipes are a guide, not medical advice. Always speak to your vet before making significant dietary changes, especially if your dog has a health condition.
                </p>
              </>
            )}

            {isLoggedIn && !isEditMode && (
              <p className="text-sm text-[var(--color-ink-500)]">
                Up next: tell us what&apos;s in your kitchen. We&apos;ll build recipes around what you already have — and flag anything to pick up.
              </p>
            )}
          </div>
        )}

        {/* ── Step 6: Kitchen / Pantry (logged-in only) ── */}
        {step === 6 && isLoggedIn && (
          <div className="space-y-4">
            <h1 className="font-heading text-4xl text-[var(--color-ink)]">What&apos;s in your kitchen?</h1>
            <p className="text-[var(--color-ink-500)]">
              Tell us what you&apos;ve got — we&apos;ll build around it. Anything you&apos;re missing will go straight on your shopping list.
            </p>

            {pantryLastUpdated && (
              <div className="rounded-xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] px-4 py-3 text-sm text-[var(--color-ink-500)]">
                Last updated {timeAgo(pantryLastUpdated)} — anything changed?
              </div>
            )}

            {/* Section A: Ingredients */}
            <CollapsibleSection
              title="Ingredients"
              open={openSections.ingredients}
              onToggle={() => toggleSection("ingredients")}
            >
              <div className="space-y-3">
                {ingredientRows.map((row, i) => (
                  <IngredientRowUI
                    key={row.name}
                    row={row}
                    onUpdate={(updated) => updateIngredient(i, false, updated)}
                  />
                ))}
                {customIngredients.map((row, i) => (
                  <IngredientRowUI
                    key={`custom-ing-${i}`}
                    row={row}
                    isCustom
                    onUpdate={(updated) => updateIngredient(i, true, updated)}
                  />
                ))}
                <button
                  type="button"
                  onClick={addCustomIngredient}
                  className="mt-1 text-sm text-[var(--color-coral)] hover:underline"
                >
                  + Add ingredient
                </button>
              </div>
            </CollapsibleSection>

            {/* Section B: Supplements */}
            <CollapsibleSection
              title="Supplements"
              open={openSections.supplements}
              onToggle={() => toggleSection("supplements")}
            >
              <div className="space-y-3">
                {supplementRows.map((row, i) => (
                  <IngredientRowUI
                    key={row.name}
                    row={row}
                    onUpdate={(updated) => updateSupplement(i, false, updated)}
                  />
                ))}
                {customSupplements.map((row, i) => (
                  <IngredientRowUI
                    key={`custom-sup-${i}`}
                    row={row}
                    isCustom
                    onUpdate={(updated) => updateSupplement(i, true, updated)}
                  />
                ))}
                <button
                  type="button"
                  onClick={addCustomSupplement}
                  className="mt-1 text-sm text-[var(--color-coral)] hover:underline"
                >
                  + Add supplement
                </button>
              </div>
            </CollapsibleSection>

            {/* Section C: Equipment */}
            <CollapsibleSection
              title="Kitchen equipment"
              open={openSections.equipment}
              onToggle={() => toggleSection("equipment")}
            >
              <div className="space-y-3">
                {equipmentRows.map((row, i) => (
                  <EquipmentRowUI
                    key={row.name}
                    row={row}
                    onUpdate={(updated) => updateEquipment(i, updated)}
                  />
                ))}
              </div>
            </CollapsibleSection>
          </div>
        )}
      </section>

      {/* Navigation bar */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          className="rounded-full border border-[var(--color-sand-deep)] px-5 py-2 text-sm text-[var(--color-ink)]"
        >
          {step === 1 ? (dogId ? "← Back to profile" : "← Back to home") : "Back"}
        </button>

        {step === 6 && isLoggedIn ? (
          // Step 6 nav: Skip + Generate (only reachable via regen/kitchen-only flow)
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={generateWithPantry}
              disabled={isGenerating}
              className="text-sm text-[var(--color-ink-500)] hover:text-[var(--color-coral)]"
            >
              Skip for now — I&apos;ll update this later
            </button>
            <button
              type="button"
              onClick={generateWithPantry}
              disabled={isGenerating}
              className={`rounded-full bg-[var(--color-coral)] px-7 py-3 text-sm font-semibold text-[var(--color-warm-white)] ${isGenerating ? "animate-pulse" : "transition-transform hover:-translate-y-0.5"}`}
            >
              {generateButtonLabel}
            </button>
          </div>
        ) : isEditMode && step === totalSteps ? (
          // Edit mode final step: save only, no generation
          <button
            type="button"
            onClick={saveProfileOnly}
            className="rounded-full bg-[var(--color-coral)] px-7 py-3 text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
          >
            Save changes →
          </button>
        ) : step < totalSteps ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!canGoNext}
            className="rounded-full bg-[var(--color-coral)] px-5 py-2 text-sm font-semibold text-[var(--color-warm-white)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue →
          </button>
        ) : (
          // Logged-out step 5: "Return home" (the generate button is embedded above)
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-full border border-[var(--color-sand-deep)] px-5 py-2 text-sm text-[var(--color-ink)]"
          >
            ← Return home
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function CollapsibleSection({
  title, open, onToggle, children,
}: { title: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="font-semibold text-[var(--color-ink)]">{title}</span>
        <span className="text-xs text-[var(--color-ink-500)]">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="border-t border-[var(--color-sand-deep)] px-5 pb-5 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

function IngredientRowUI({
  row, isCustom = false, onUpdate,
}: { row: IngredientRow; isCustom?: boolean; onUpdate: (updated: IngredientRow) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {isCustom ? (
        <input
          type="text"
          value={row.name}
          placeholder="Ingredient name"
          onChange={(e) => onUpdate({ ...row, name: e.target.value })}
          className="h-8 w-36 rounded-lg border border-[var(--color-sand-deep)] bg-[var(--color-sand)] px-2 text-sm outline-none focus:border-[var(--color-coral)]"
        />
      ) : (
        <span className="w-36 flex-shrink-0 text-sm capitalize text-[var(--color-ink)]">{row.name}</span>
      )}

      {row.isAvailable && (
        <>
          <input
            type="number"
            min={0}
            value={row.quantity}
            onChange={(e) => onUpdate({ ...row, quantity: e.target.value })}
            placeholder="qty"
            className="h-8 w-20 rounded-lg border border-[var(--color-sand-deep)] bg-[var(--color-sand)] px-2 text-sm outline-none focus:border-[var(--color-coral)]"
          />
          <span className="text-xs text-[var(--color-ink-500)]">{row.unit}</span>
          <label className="flex items-center gap-1.5 text-xs text-[var(--color-ink-500)]">
            <input
              type="checkbox"
              checked={row.isRunningLow}
              onChange={(e) => onUpdate({ ...row, isRunningLow: e.target.checked })}
              className="accent-[var(--color-coral)]"
            />
            Running low
          </label>
        </>
      )}

      <div className="ml-auto inline-flex rounded-full border border-[var(--color-sand-deep)] bg-[var(--color-sand)] p-0.5 text-xs">
        <button
          type="button"
          onClick={() => onUpdate({ ...row, isAvailable: true })}
          className={`rounded-full px-3 py-1 transition-colors ${row.isAvailable ? "bg-[var(--color-coral)] text-[var(--color-warm-white)]" : "text-[var(--color-ink-500)]"}`}
        >
          Have it
        </button>
        <button
          type="button"
          onClick={() => onUpdate({ ...row, isAvailable: false })}
          className={`rounded-full px-3 py-1 transition-colors ${!row.isAvailable ? "bg-[var(--color-sand-deep)] text-[var(--color-ink)]" : "text-[var(--color-ink-500)]"}`}
        >
          Don&apos;t have
        </button>
      </div>
    </div>
  );
}

function EquipmentRowUI({
  row, onUpdate,
}: { row: EquipmentRow; onUpdate: (updated: EquipmentRow) => void }) {
  const affectsRecipes = RECIPE_AFFECTING_EQUIPMENT.includes(row.name);
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm capitalize text-[var(--color-ink)]">{row.name}</span>
        <div className="inline-flex rounded-full border border-[var(--color-sand-deep)] bg-[var(--color-sand)] p-0.5 text-xs">
          <button
            type="button"
            onClick={() => onUpdate({ ...row, isAvailable: true })}
            className={`rounded-full px-3 py-1 transition-colors ${row.isAvailable ? "bg-[var(--color-coral)] text-[var(--color-warm-white)]" : "text-[var(--color-ink-500)]"}`}
          >
            Have it
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ ...row, isAvailable: false })}
            className={`rounded-full px-3 py-1 transition-colors ${!row.isAvailable ? "bg-[var(--color-sand-deep)] text-[var(--color-ink)]" : "text-[var(--color-ink-500)]"}`}
          >
            Don&apos;t have
          </button>
        </div>
      </div>
      {!row.isAvailable && affectsRecipes && (
        <p className="mt-1 text-xs italic text-[var(--color-coral)]">
          We&apos;ll only show recipes you can make with your current equipment.
        </p>
      )}
    </div>
  );
}

function DetailBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--color-sand-deep)] bg-[var(--color-sand)] p-4">
      <p className="text-sm font-semibold text-[var(--color-ink)]">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function SingleSelectChips<T extends { id: string; label: string }>(props: {
  options: T[]; value: string; onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {props.options.map((opt) => {
        const selected = props.value === opt.id;
        return (
          <button
            key={opt.id} type="button" onClick={() => props.onChange(opt.id)}
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${selected ? "border-[var(--color-coral)] bg-[var(--color-coral)] text-[var(--color-warm-white)]" : "border-[var(--color-sand-deep)] text-[var(--color-ink-500)]"}`}
          >{opt.label}</button>
        );
      })}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-[var(--color-sand-deep)] py-2.5">
      <span className="text-sm text-[var(--color-ink-500)]">{label}</span>
      <span className="text-right text-sm font-medium text-[var(--color-ink)]">{value || "—"}</span>
    </div>
  );
}

export default function OnboardPageWrapper() {
  return (
    <Suspense>
      <OnboardPage />
    </Suspense>
  );
}
