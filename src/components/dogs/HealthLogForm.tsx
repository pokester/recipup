"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DefaultValues = {
  weight_kg: number | null;
  energy_level: string | null;
  coat_score: number | null;
  appetite: string | null;
  itching: string | null;
  joint_stiffness: string | null;
  digestion: string | null;
  vomiting: string | null;
  notes: string | null;
};

type Props = {
  dogId: string;
  dogName: string;
  hasJointCondition: boolean;
  defaultValues: DefaultValues | null;
  previousWeekLabel: string | null;
};

const ENERGY_OPTIONS = [
  { value: "low", label: "😴 Low" },
  { value: "normal", label: "😊 Normal" },
  { value: "high", label: "⚡ High" },
] as const;

const APPETITE_OPTIONS = [
  { value: "refusing", label: "Refusing" },
  { value: "reduced", label: "Reduced" },
  { value: "normal", label: "Normal" },
  { value: "enthusiastic", label: "Enthusiastic" },
] as const;

const ITCHING_OPTIONS = [
  { value: "none", label: "None" },
  { value: "occasional", label: "Occasional" },
  { value: "frequent", label: "Frequent" },
] as const;

const JOINT_OPTIONS = [
  { value: "none", label: "None" },
  { value: "mild", label: "Mild" },
  { value: "noticeable", label: "Noticeable" },
] as const;

const DIGESTION_OPTIONS = [
  { value: "great", label: "Great" },
  { value: "variable", label: "Variable" },
  { value: "unsettled", label: "Unsettled" },
] as const;

const VOMITING_OPTIONS = [
  { value: "none", label: "No" },
  { value: "once", label: "Once" },
  { value: "more_than_once", label: "More than once" },
] as const;

function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
            value === opt.value
              ? "border-[var(--color-coral)] bg-[var(--color-coral)] text-[var(--color-warm-white)]"
              : "border-[var(--color-sand-deep)] bg-[var(--color-sand)] text-[var(--color-ink)] hover:border-[var(--color-coral)]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function HealthLogForm({ dogId, dogName, hasJointCondition, defaultValues, previousWeekLabel }: Props) {
  const router = useRouter();
  const [weightKg, setWeightKg] = useState<string>(defaultValues?.weight_kg?.toString() ?? "");
  const [energyLevel, setEnergyLevel] = useState<string | null>(defaultValues?.energy_level ?? null);
  const [coatScore, setCoatScore] = useState<number | null>(defaultValues?.coat_score ?? null);
  const [appetite, setAppetite] = useState<string | null>(defaultValues?.appetite ?? null);
  const [itching, setItching] = useState<string | null>(defaultValues?.itching ?? null);
  const [jointStiffness, setJointStiffness] = useState<string | null>(defaultValues?.joint_stiffness ?? null);
  const [digestion, setDigestion] = useState<string | null>(defaultValues?.digestion ?? null);
  const [vomiting, setVomiting] = useState<string | null>(defaultValues?.vomiting ?? null);
  const [notes, setNotes] = useState(defaultValues?.notes ?? "");
  const [showOptional, setShowOptional] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasCoreMetric = energyLevel !== null || coatScore !== null || appetite !== null || weightKg.trim() !== "";
  const isValid = hasCoreMetric;

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/health-log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          dog_id: dogId,
          weight_kg: weightKg.trim() ? parseFloat(weightKg) : null,
          energy_level: energyLevel,
          coat_score: coatScore,
          appetite,
          itching,
          joint_stiffness: jointStiffness,
          digestion,
          vomiting,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      router.push(`/dogs/${dogId}#health`);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Core metrics */}
      <section className="rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-6 shadow-[var(--shadow-card)]">
        <h2 className="font-heading text-xl text-[var(--color-ink)]">This week</h2>

        {/* Weight */}
        <div className="mt-6">
          <label className="block text-sm font-semibold text-[var(--color-ink)]">
            Weight today
          </label>
          {previousWeekLabel && defaultValues?.weight_kg && (
            <p className="mt-0.5 text-xs text-[var(--color-ink-300)]">
              Last logged: {defaultValues.weight_kg}kg ({previousWeekLabel})
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              min="0"
              max="150"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="e.g. 28.5"
              className="h-12 w-32 rounded-full border border-[var(--color-sand-deep)] bg-[var(--color-sand)] px-5 text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-300)] focus:border-[var(--color-coral)]"
            />
            <span className="text-sm text-[var(--color-ink-500)]">kg</span>
          </div>
        </div>

        {/* Energy */}
        <div className="mt-6">
          <label className="block text-sm font-semibold text-[var(--color-ink)]">Energy this week</label>
          <div className="mt-2">
            <ChipGroup
              options={ENERGY_OPTIONS}
              value={energyLevel as typeof ENERGY_OPTIONS[number]["value"] | null}
              onChange={(v) => setEnergyLevel(v)}
            />
          </div>
        </div>

        {/* Coat score */}
        <div className="mt-6">
          <label className="block text-sm font-semibold text-[var(--color-ink)]">Coat and skin condition</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCoatScore(n)}
                className={`h-11 w-11 rounded-full border text-sm font-semibold transition-colors ${
                  coatScore === n
                    ? "border-[var(--color-coral)] bg-[var(--color-coral)] text-[var(--color-warm-white)]"
                    : "border-[var(--color-sand-deep)] bg-[var(--color-sand)] text-[var(--color-ink)] hover:border-[var(--color-coral)]"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--color-ink-300)]">1 = very dull/flaky · 5 = glossy and healthy</p>
        </div>

        {/* Appetite */}
        <div className="mt-6">
          <label className="block text-sm font-semibold text-[var(--color-ink)]">Appetite this week</label>
          <div className="mt-2">
            <ChipGroup
              options={APPETITE_OPTIONS}
              value={appetite as typeof APPETITE_OPTIONS[number]["value"] | null}
              onChange={(v) => setAppetite(v)}
            />
          </div>
        </div>
      </section>

      {/* Optional section */}
      <section className="rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-6 shadow-[var(--shadow-card)]">
        <button
          type="button"
          onClick={() => setShowOptional((v) => !v)}
          className="text-sm font-semibold text-[var(--color-coral)] hover:underline"
        >
          {showOptional ? "− Less detail" : "+ Add more detail"}
        </button>

        {showOptional && (
          <div className="mt-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-[var(--color-ink)]">Any itching or scratching?</label>
              <div className="mt-2">
                <ChipGroup options={ITCHING_OPTIONS} value={itching as typeof ITCHING_OPTIONS[number]["value"] | null} onChange={(v) => setItching(v)} />
              </div>
            </div>

            {hasJointCondition && (
              <div>
                <label className="block text-sm font-semibold text-[var(--color-ink)]">Joint stiffness observed?</label>
                <div className="mt-2">
                  <ChipGroup options={JOINT_OPTIONS} value={jointStiffness as typeof JOINT_OPTIONS[number]["value"] | null} onChange={(v) => setJointStiffness(v)} />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-[var(--color-ink)]">Digestion this week</label>
              <div className="mt-2">
                <ChipGroup options={DIGESTION_OPTIONS} value={digestion as typeof DIGESTION_OPTIONS[number]["value"] | null} onChange={(v) => setDigestion(v)} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-ink)]">Any vomiting this week?</label>
              <div className="mt-2">
                <ChipGroup options={VOMITING_OPTIONS} value={vomiting as typeof VOMITING_OPTIONS[number]["value"] | null} onChange={(v) => setVomiting(v)} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-ink)]">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={`Anything else worth noting about ${dogName} this week...`}
                className="mt-2 w-full rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-sand)] px-4 py-3 text-sm text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-300)] focus:border-[var(--color-coral)]"
              />
            </div>
          </div>
        )}
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isValid || submitting}
        className="w-full rounded-full bg-[var(--color-coral)] py-4 text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5 disabled:opacity-40"
      >
        {submitting ? "Saving..." : "Save this week's log →"}
      </button>

      <p className="text-center text-xs text-[var(--color-ink-300)]">
        Recipup recipes are a guide, not medical advice. Always speak to your vet before making significant dietary changes, especially if your dog has a health condition.
      </p>
    </div>
  );
}
