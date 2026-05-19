import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Dog = {
  id: string;
  name: string;
  breed: string | null;
  age_years: number | null;
  weight_kg: number | null;
  sex: string | null;
};

function toTitleCase(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

type HealthLogSummary = {
  dog_id: string;
  week_start: string;
  weight_kg: number | null;
  coat_score: number | null;
};

function healthStatusDot(weekStart: string | undefined): "green" | "amber" | "grey" {
  if (!weekStart) return "grey";
  const daysAgo = Math.floor((Date.now() - new Date(weekStart).getTime()) / (1000 * 60 * 60 * 24));
  if (daysAgo <= 7) return "green";
  if (daysAgo <= 21) return "amber";
  return "grey";
}

function daysAgoLabel(dateStr: string) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function ageLabel(years: number | null): string | null {
  if (years === null) return null;
  if (years < 1) return "Puppy";
  if (years >= 8) return `${years}y (senior)`;
  return `${years}y`;
}

const DOT_COLORS = {
  green: "bg-[var(--color-sage)]",
  amber: "bg-amber-400",
  grey: "bg-[var(--color-ink-100)]",
};

export default async function DogsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: dogs } = await supabase
    .from("dogs")
    .select("id, name, breed, age_years, weight_kg, sex")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const typedDogs = (dogs ?? []) as Dog[];

  let latestLogs: HealthLogSummary[] = [];
  if (typedDogs.length > 0) {
    const { data: logsData } = await supabase
      .from("health_logs")
      .select("dog_id, week_start, weight_kg, coat_score")
      .in("dog_id", typedDogs.map((d) => d.id))
      .order("week_start", { ascending: false });

    if (logsData) {
      const seen = new Set<string>();
      latestLogs = (logsData as HealthLogSummary[]).filter((l) => {
        if (seen.has(l.dog_id)) return false;
        seen.add(l.dog_id);
        return true;
      });
    }
  }

  const logByDogId = new Map(latestLogs.map((l) => [l.dog_id, l]));

  return (
    <div className="mx-auto max-w-4xl px-6">
      {/* Page header */}
      <div className="flex items-end justify-between pt-12 pb-8">
        <div>
          <h1 className="font-heading text-3xl text-[var(--color-ink)]">Your pack</h1>
          <p className="mt-2 max-w-md text-sm text-[var(--color-ink-500)]">
            Every dog, every profile, every recipe plan — all in one place.
          </p>
        </div>
        <Link
          href="/onboard"
          className="rounded-full bg-[var(--color-coral)] px-5 py-2.5 text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
        >
          Add a dog +
        </Link>
      </div>

      {typedDogs.length > 0 ? (
        <div className="space-y-4 pb-16">
          {typedDogs.map((dog) => {
            const log = logByDogId.get(dog.id) ?? null;
            const dotStatus = healthStatusDot(log?.week_start);
            const initials = toTitleCase(dog.name).slice(0, 2).toUpperCase();
            const subtitle = [
              dog.breed ? dog.breed.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : null,
              ageLabel(dog.age_years),
              dog.weight_kg !== null ? `${dog.weight_kg}kg` : null,
              dog.sex ? toTitleCase(dog.sex.replace(/_/g, " ")) : null,
            ].filter(Boolean).join(" · ");

            return (
              <div
                key={dog.id}
                className="flex items-center gap-6 rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-6 shadow-[var(--shadow-card)]"
              >
                {/* Avatar + health dot */}
                <div className="flex shrink-0 flex-col items-center gap-2">
                  <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[var(--color-coral)]/10">
                    <span className="font-heading text-2xl font-semibold text-[var(--color-coral)]">{initials}</span>
                  </div>
                  <span
                    className={`h-2 w-2 rounded-full ${DOT_COLORS[dotStatus]}`}
                    title={dotStatus === "green" ? "Logged this week" : dotStatus === "amber" ? "Logged 1–2 weeks ago" : "No recent log"}
                  />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-xl text-[var(--color-ink)]">{toTitleCase(dog.name)}</p>
                  {subtitle && (
                    <p className="mt-1 text-sm text-[var(--color-ink-500)]">{subtitle}</p>
                  )}
                  <div className="mt-3">
                    {log ? (
                      <p className="text-xs text-[var(--color-ink-500)]">
                        Weight: {log.weight_kg != null ? `${log.weight_kg}kg` : "—"}
                        {log.coat_score != null ? ` · Coat: ${log.coat_score}/5` : ""}
                        {" · "}Last logged {daysAgoLabel(log.week_start)}
                      </p>
                    ) : (
                      <p className="text-xs text-[var(--color-ink-300)]">No health logs yet</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="shrink-0">
                  <Link
                    href={`/dogs/${dog.id}`}
                    className="rounded-full border border-[var(--color-ink-300)] px-4 py-2 text-center text-sm font-semibold text-[var(--color-ink)]"
                  >
                    View profile →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center">
          <p className="font-heading text-2xl text-[var(--color-ink)]">No dogs added yet.</p>
          <p className="mt-3 text-[var(--color-ink-500)]">Add your first dog&apos;s profile to get started.</p>
          <Link
            href="/onboard"
            className="mt-8 inline-block rounded-full bg-[var(--color-coral)] px-6 py-3 text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
          >
            Add your first dog →
          </Link>
        </div>
      )}
    </div>
  );
}
