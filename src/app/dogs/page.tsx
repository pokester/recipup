import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Dog = {
  id: string;
  name: string;
  breed: string | null;
  age_years: number | null;
  weight_kg: number | null;
};

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

const DOT_CLASSES = {
  green: "bg-green-500",
  amber: "bg-amber-400",
  grey: "bg-[var(--color-border-strong)]",
};

export default async function DogsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: dogs } = await supabase
    .from("dogs")
    .select("id, name, breed, age_years, weight_kg")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const typedDogs = (dogs ?? []) as Dog[];

  // Fetch latest health log per dog
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
    <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-4xl text-[var(--color-ink)]">Your pack</h1>
          <p className="mt-2 text-[var(--color-ink-soft)]">
            {typedDogs.length > 0
              ? "Every dog, every profile, every recipe plan — all in one place."
              : "No dogs added yet."}
          </p>
        </div>
        <Link
          href="/onboard"
          className="rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-cream)] transition-transform hover:-translate-y-0.5"
        >
          Add a dog +
        </Link>
      </div>

      {typedDogs.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {typedDogs.map((dog) => {
            const log = logByDogId.get(dog.id) ?? null;
            const dotStatus = healthStatusDot(log?.week_start);

            return (
              <div
                key={dog.id}
                className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] p-6"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/dogs/${dog.id}`}
                      className="font-heading text-2xl text-[var(--color-ink)] hover:text-[var(--color-accent)]"
                    >
                      {dog.name}
                    </Link>
                    {dog.breed && (
                      <p className="mt-0.5 text-sm capitalize text-[var(--color-ink-soft)]">
                        {dog.breed.replace(/_/g, " ")}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-2">
                      {dog.age_years !== null && (
                        <span className="text-xs text-[var(--color-ink-soft)]">{dog.age_years}y</span>
                      )}
                      {dog.weight_kg !== null && (
                        <span className="text-xs text-[var(--color-ink-soft)]">{dog.weight_kg}kg</span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${DOT_CLASSES[dotStatus]}`}
                    title={dotStatus === "green" ? "Logged this week" : dotStatus === "amber" ? "Logged 1–2 weeks ago" : "No recent log"}
                  />
                </div>

                {/* Health snapshot */}
                <div className="mt-3">
                  {log ? (
                    <p className="text-xs text-[var(--color-ink-soft)]">
                      Weight: {log.weight_kg != null ? `${log.weight_kg}kg` : "—"}
                      {log.coat_score != null ? ` · Coat: ${log.coat_score}/5` : ""}
                      {" · "}Last logged {daysAgoLabel(log.week_start)}
                    </p>
                  ) : (
                    <p className="text-xs text-[var(--color-ink-soft)]">No health logs yet</p>
                  )}
                </div>

                <div className="mt-5 flex flex-col gap-2">
                  <Link
                    href={`/dogs/${dog.id}`}
                    className="block rounded-full border border-[var(--color-border-strong)] py-2 text-center text-sm font-semibold text-[var(--color-ink)]"
                  >
                    View profile →
                  </Link>
                  <Link
                    href={`/onboard?dog_id=${dog.id}`}
                    className="block rounded-full bg-[var(--color-accent)] py-2 text-center text-sm font-semibold text-[var(--color-cream)] transition-transform hover:-translate-y-0.5"
                  >
                    Generate recipes →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-cream-soft)] p-10 text-center">
          <p className="font-heading text-2xl text-[var(--color-ink)]">No dogs added yet.</p>
          <p className="mt-2 text-[var(--color-ink-soft)]">
            Add your first dog&apos;s profile to get started.
          </p>
          <Link
            href="/onboard"
            className="mt-6 inline-block rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[var(--color-cream)] transition-transform hover:-translate-y-0.5"
          >
            Add your first dog →
          </Link>
        </div>
      )}
    </div>
  );
}
