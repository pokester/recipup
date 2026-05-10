"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

type HealthLog = {
  id: string;
  week_start: string;
  weight_kg: number | null;
  energy_level: string | null;
  coat_score: number | null;
  appetite: string | null;
  itching: string | null;
  joint_stiffness: string | null;
  digestion: string | null;
  vomiting: string | null;
  notes: string | null;
  recipe_adjustments: Array<{ type: string; reason: string; instruction: string }>;
  response_message: string | null;
  vet_flag: boolean;
  vet_message: string | null;
};

type Dog = {
  id: string;
  name: string;
  breed: string | null;
  age_years: number | null;
  weight_kg: number | null;
  sex: string | null;
  goal: string | null;
  diet_type: string | null;
};

type MealPlan = {
  id: string;
  start_date: string;
  end_date: string;
  cooking_frequency: string;
  status: string;
};

type SavedRecipe = {
  id: string;
  recipe_data: { name?: string; tagline?: string; method?: string };
  saved_at: string;
};

type Props = {
  dog: Dog;
  healthLogs: HealthLog[];
  activePlan: MealPlan | null;
  allPlans: MealPlan[];
  savedRecipes: SavedRecipe[];
  hasHealthAccess: boolean;
  latestLogResponse: HealthLog | null;
};

type TabId = "overview" | "health" | "recipes" | "plans";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "health", label: "Health" },
  { id: "recipes", label: "Recipes" },
  { id: "plans", label: "Plans" },
];

const RANGE_OPTIONS: { label: string; weeks: number | null }[] = [
  { label: "4 weeks", weeks: 4 },
  { label: "12 weeks", weeks: 12 },
  { label: "All time", weeks: null },
];

function energyVal(e: string | null) {
  if (e === "low") return 1;
  if (e === "normal") return 2;
  if (e === "high") return 3;
  return null;
}

function appetiteVal(a: string | null) {
  if (a === "refusing") return 1;
  if (a === "reduced") return 2;
  if (a === "normal") return 3;
  if (a === "enthusiastic") return 4;
  return null;
}

function daysAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "today";
  if (diff === 1) return "yesterday";
  return `${diff} days ago`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function capitalize(s: string | null) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

function toTitleCase(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

export function DogHubClient({
  dog,
  healthLogs,
  activePlan,
  allPlans,
  savedRecipes,
  hasHealthAccess,
  latestLogResponse,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (typeof window === "undefined") return "overview";
    const hash = window.location.hash.replace("#", "") as TabId;
    return TABS.some((t) => t.id === hash) ? hash : "overview";
  });
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [rangeWeeks, setRangeWeeks] = useState<number | null>(12);

  const switchTab = (tab: TabId) => {
    setActiveTab(tab);
    history.replaceState(null, "", `#${tab}`);
  };

  const displayName = toTitleCase(dog.name);
  const latestLog = healthLogs[0] ?? null;
  const prevLog = healthLogs[1] ?? null;
  const weightChange =
    latestLog?.weight_kg != null && prevLog?.weight_kg != null
      ? latestLog.weight_kg - prevLog.weight_kg
      : null;

  const filteredLogs = rangeWeeks
    ? healthLogs.slice(0, rangeWeeks)
    : healthLogs;

  const chartData = [...filteredLogs].reverse().map((l) => ({
    date: l.week_start,
    weight: l.weight_kg,
    coat: l.coat_score,
    energy: energyVal(l.energy_level),
    appetite: appetiteVal(l.appetite),
  }));

  const avgCoat =
    healthLogs.filter((l) => l.coat_score !== null).reduce((s, l) => s + (l.coat_score ?? 0), 0) /
      (healthLogs.filter((l) => l.coat_score !== null).length || 1) || null;

  const totalAdjustments = healthLogs.reduce(
    (s, l) => s + (l.recipe_adjustments?.length ?? 0),
    0,
  );

  return (
    <div>
      {/* Latest log response card */}
      {latestLogResponse && (
        <div
          className={`mb-6 rounded-2xl border px-6 py-5 ${
            latestLogResponse.vet_flag
              ? "border-amber-300 border-l-4 border-l-amber-500 bg-amber-50"
              : "border-[var(--color-sand-deep)] border-l-4 bg-[var(--color-sand)]"
          }`}
          style={latestLogResponse.vet_flag ? undefined : { borderLeftColor: "var(--color-coral)" }}
        >
          <p className="font-semibold text-[var(--color-ink)]">
            {latestLogResponse.vet_flag ? "⚠️ " : ""}
            {displayName} · Week of {formatDate(latestLogResponse.week_start)}
          </p>
          <p className="mt-2 text-sm text-[var(--color-ink-500)]">{latestLogResponse.response_message}</p>
          {latestLogResponse.vet_flag && latestLogResponse.vet_message && (
            <p className="mt-3 rounded-xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-900">
              {latestLogResponse.vet_message}
            </p>
          )}
        </div>
      )}

      {/* Tab bar — underline style */}
      <div className="mb-8 flex border-b border-[var(--color-sand-deep)]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => switchTab(tab.id)}
            className={`-mb-px border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? "border-[var(--color-coral)] text-[var(--color-coral)]"
                : "border-transparent text-[var(--color-ink-500)] hover:text-[var(--color-ink)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Health snapshot */}
          <div className="rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-6 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-heading text-xl text-[var(--color-ink)]">Latest health snapshot</h2>
              <Link
                href={`/dogs/${dog.id}/log`}
                className="rounded-full bg-[var(--color-coral)] px-4 py-2 text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
              >
                Log this week →
              </Link>
            </div>
            {latestLog ? (
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-500)]">Weight</p>
                  <p className="mt-1 font-semibold text-[var(--color-ink)]">
                    {latestLog.weight_kg != null ? `${latestLog.weight_kg}kg` : "—"}
                    {weightChange !== null && (
                      <span
                        className={`ml-1 text-xs ${
                          weightChange > 0 ? "text-amber-600" : weightChange < 0 ? "text-blue-600" : "text-[var(--color-ink-500)]"
                        }`}
                      >
                        {weightChange > 0 ? `↑${weightChange.toFixed(1)}` : weightChange < 0 ? `↓${Math.abs(weightChange).toFixed(1)}` : "→"}
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-500)]">Energy</p>
                  <p className="mt-1 font-semibold text-[var(--color-ink)]">
                    {latestLog.energy_level === "low" ? "😴 Low" : latestLog.energy_level === "high" ? "⚡ High" : latestLog.energy_level === "normal" ? "😊 Normal" : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-500)]">Coat</p>
                  <p className="mt-1 font-semibold text-[var(--color-ink)]">
                    {latestLog.coat_score != null ? `${latestLog.coat_score}/5` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-500)]">Appetite</p>
                  <p className="mt-1 font-semibold capitalize text-[var(--color-ink)]">
                    {latestLog.appetite ?? "—"}
                  </p>
                </div>
                <p className="col-span-2 text-xs text-[var(--color-ink-300)] md:col-span-4">
                  Last logged {daysAgo(latestLog.week_start)}
                </p>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-[var(--color-ink-500)]">
                  No health logs yet. Start tracking {displayName}&apos;s health to see trends build over time.
                </p>
              </div>
            )}
          </div>

          {/* Active plan */}
          {activePlan && (
            <div className="rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-6 shadow-[var(--shadow-card)]">
              <h2 className="font-heading text-xl text-[var(--color-ink)]">Current meal plan</h2>
              <p className="mt-1 text-sm text-[var(--color-ink-500)]">
                {formatDate(activePlan.start_date)} – {formatDate(activePlan.end_date)}
              </p>
              <Link
                href={`/planner/${activePlan.id}`}
                className="mt-4 inline-block rounded-full border border-[var(--color-sand-deep)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
              >
                View plan →
              </Link>
            </div>
          )}

          {/* Latest recipe */}
          {savedRecipes[0] && (
            <div className="rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-6 shadow-[var(--shadow-card)]">
              <h2 className="font-heading text-xl text-[var(--color-ink)]">Latest saved recipe</h2>
              <p className="mt-1 font-semibold text-[var(--color-ink)]">
                {savedRecipes[0].recipe_data.name ?? "Untitled"}
              </p>
              <p className="text-xs text-[var(--color-ink-500)]">Saved {daysAgo(savedRecipes[0].saved_at)}</p>
              <Link
                href="/library"
                className="mt-4 inline-block text-sm font-semibold text-[var(--color-coral)] hover:underline"
              >
                View saved recipes →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── HEALTH TAB ── */}
      {activeTab === "health" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <Link
              href={`/dogs/${dog.id}/log`}
              className="rounded-full bg-[var(--color-coral)] px-5 py-2.5 text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
            >
              Log this week →
            </Link>
          </div>

          {!hasHealthAccess ? (
            <div className="rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-10 text-center">
              <p className="font-heading text-2xl text-[var(--color-ink)]">Health tracking is a Pack Pro feature</p>
              <p className="mt-3 mx-auto max-w-md text-[var(--color-ink-500)]">
                Upgrade to track {displayName}&apos;s progress and let us adjust recipes based on how they&apos;re doing week by week.
              </p>
              <Link
                href="/pricing"
                className="mt-6 inline-block rounded-full bg-[var(--color-coral)] px-6 py-3 text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
              >
                See plans →
              </Link>
            </div>
          ) : healthLogs.length === 0 ? (
            <div className="rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-10 text-center">
              <p className="font-heading text-2xl text-[var(--color-ink)]">No health logs yet</p>
              <p className="mt-2 text-[var(--color-ink-500)]">
                Log {displayName}&apos;s first week to start tracking trends.
              </p>
            </div>
          ) : (
            <>
              {/* Range selector */}
              <div className="flex gap-1 rounded-full bg-[var(--color-sand)] p-0.5 self-start">
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setRangeWeeks(opt.weeks)}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                      rangeWeeks === opt.weeks
                        ? "bg-[var(--color-warm-white)] shadow-sm text-[var(--color-ink)]"
                        : "text-[var(--color-ink-500)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Weight chart */}
              <div className="rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-6 shadow-[var(--shadow-card)]">
                <p className="mb-4 font-semibold text-[var(--color-ink)]">Weight (kg)</p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "var(--color-ink-300)" }}
                      tickFormatter={(v: string) => new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    />
                    <YAxis tick={{ fontSize: 10, fill: "var(--color-ink-300)" }} domain={["auto", "auto"]} width={32} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid var(--color-sand-deep)" }}
                      labelFormatter={(v: unknown) => new Date(String(v)).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    />
                    {dog.goal === "lose_weight" || dog.goal === "gain_weight" ? (
                      <ReferenceLine y={dog.weight_kg ?? undefined} stroke="var(--color-coral)" strokeDasharray="4 4" />
                    ) : null}
                    <Line type="monotone" dataKey="weight" stroke="var(--color-coral)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Coat score chart */}
              <div className="rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-6 shadow-[var(--shadow-card)]">
                <p className="mb-4 font-semibold text-[var(--color-ink)]">Coat score (1–5)</p>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "var(--color-ink-300)" }}
                      tickFormatter={(v: string) => new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    />
                    <YAxis tick={{ fontSize: 10, fill: "var(--color-ink-300)" }} domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} width={24} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid var(--color-sand-deep)" }} />
                    <ReferenceLine y={3} stroke="var(--color-sand-deep)" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="coat" stroke="var(--color-coral)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Energy & appetite chart */}
              <div className="rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-6 shadow-[var(--shadow-card)]">
                <p className="mb-2 font-semibold text-[var(--color-ink)]">Energy &amp; appetite</p>
                <div className="mb-4 flex items-center gap-5 text-xs text-[var(--color-ink-500)]">
                  <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm bg-[var(--color-coral)]" /> Energy</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm bg-[var(--color-sand-deep)]" /> Appetite</span>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "var(--color-ink-300)" }}
                      tickFormatter={(v: string) => new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    />
                    <YAxis tick={{ fontSize: 10, fill: "var(--color-ink-300)" }} domain={[0, 4]} width={24} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid var(--color-sand-deep)" }} />
                    <Bar dataKey="energy" fill="#C97D4E" radius={[4, 4, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="appetite" fill="#E9D7C5" radius={[4, 4, 0, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {[
                  { label: "Current weight", value: latestLog?.weight_kg != null ? `${latestLog.weight_kg}kg` : "—" },
                  { label: "Avg coat score", value: avgCoat ? `${avgCoat.toFixed(1)}/5` : "—" },
                  { label: "Weeks tracked", value: String(healthLogs.length) },
                  { label: "Adjustments made", value: String(totalAdjustments) },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-4">
                    <p className="text-xs text-[var(--color-ink-500)]">{stat.label}</p>
                    <p className="mt-1 font-heading text-2xl text-[var(--color-ink)]">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Log history */}
              <div>
                <h3 className="mb-4 font-heading text-xl text-[var(--color-ink)]">Previous logs</h3>
                <div className="space-y-3">
                  {healthLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] px-5 py-4"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                        className="flex w-full items-start justify-between gap-4 text-left"
                      >
                        <div>
                          <p className="font-semibold text-[var(--color-ink)]">Week of {formatDate(log.week_start)}</p>
                          <p className="mt-1 text-sm text-[var(--color-ink-500)]">
                            {log.weight_kg != null ? `Weight: ${log.weight_kg}kg · ` : ""}
                            {log.energy_level ? `Energy: ${capitalize(log.energy_level)} · ` : ""}
                            {log.coat_score != null ? `Coat: ${log.coat_score}/5 · ` : ""}
                            {log.appetite ? `Appetite: ${capitalize(log.appetite)}` : ""}
                          </p>
                          {log.recipe_adjustments?.length > 0 && (
                            <p className="mt-1 text-xs font-semibold text-[var(--color-coral)]">
                              {log.recipe_adjustments.length} recipe adjustment{log.recipe_adjustments.length !== 1 ? "s" : ""} made this week
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-[var(--color-ink-300)]">{expandedLog === log.id ? "▲" : "▼"}</span>
                      </button>

                      {expandedLog === log.id && (
                        <div className="mt-4 space-y-2 border-t border-[var(--color-sand-deep)] pt-4 text-sm text-[var(--color-ink-500)]">
                          {log.itching && <p>Itching: {capitalize(log.itching)}</p>}
                          {log.joint_stiffness && <p>Joint stiffness: {capitalize(log.joint_stiffness)}</p>}
                          {log.digestion && <p>Digestion: {capitalize(log.digestion)}</p>}
                          {log.vomiting && <p>Vomiting: {capitalize(log.vomiting)}</p>}
                          {log.notes && <p className="italic">{log.notes}</p>}
                          {log.response_message && (
                            <div className={`mt-3 rounded-xl border px-4 py-3 text-sm ${log.vet_flag ? "border-amber-200 bg-amber-50" : "border-[var(--color-sand-deep)] bg-[var(--color-sand)]"}`}>
                              {log.vet_flag && <p className="mb-1 font-semibold text-amber-900">⚠️ {log.vet_message}</p>}
                              <p className="text-[var(--color-ink-500)]">{log.response_message}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── RECIPES TAB ── */}
      {activeTab === "recipes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-heading text-xl text-[var(--color-ink)]">Saved recipes for {displayName}</h2>
            <Link
              href={`/onboard?dog_id=${dog.id}`}
              className="rounded-full bg-[var(--color-coral)] px-4 py-2 text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
            >
              Generate new recipes →
            </Link>
          </div>

          {savedRecipes.length > 0 ? (
            <div className="space-y-3">
              {savedRecipes.map((item) => {
                const methodLabel =
                  item.recipe_data.method === "slow_cooker"
                    ? "Slow Cooker"
                    : item.recipe_data.method === "one_pot"
                      ? "One Pot"
                      : item.recipe_data.method === "oven"
                        ? "Oven"
                        : null;
                return (
                  <div key={item.id} className="rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] px-5 py-4">
                    <p className="font-heading text-lg text-[var(--color-ink)]">{item.recipe_data.name ?? "Untitled"}</p>
                    {item.recipe_data.tagline && <p className="mt-0.5 text-sm italic text-[var(--color-ink-500)]">{item.recipe_data.tagline}</p>}
                    <div className="mt-2 flex gap-2">
                      {methodLabel && (
                        <span className="rounded-full border border-[var(--color-sand-deep)] bg-[var(--color-sand)] px-3 py-0.5 text-xs text-[var(--color-ink)]">{methodLabel}</span>
                      )}
                      <span className="text-xs text-[var(--color-ink-300)]">Saved {daysAgo(item.saved_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-10 text-center">
              <p className="font-heading text-xl text-[var(--color-ink)]">No saved recipes yet for {displayName}.</p>
              <p className="mt-2 text-[var(--color-ink-500)]">Generate a recipe plan to get started.</p>
              <Link
                href={`/onboard?dog_id=${dog.id}`}
                className="mt-6 inline-block rounded-full bg-[var(--color-coral)] px-6 py-3 text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
              >
                Generate recipes →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── PLANS TAB ── */}
      {activeTab === "plans" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-heading text-xl text-[var(--color-ink)]">Meal plans for {displayName}</h2>
            <Link
              href={`/planner/new?dog_id=${dog.id}`}
              className="rounded-full bg-[var(--color-coral)] px-4 py-2 text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
            >
              Create new plan →
            </Link>
          </div>

          {allPlans.length > 0 ? (
            <div className="space-y-3">
              {allPlans.map((plan) => {
                const isActive = plan.status === "active";
                return (
                  <div key={plan.id} className={`rounded-2xl border px-5 py-4 ${isActive ? "border-[var(--color-coral)] bg-[var(--color-warm-white)]" : "border-[var(--color-sand-deep)] bg-[var(--color-warm-white)]"}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          {isActive && <span className="h-2 w-2 rounded-full bg-green-500" />}
                          <p className="font-semibold text-[var(--color-ink)]">
                            {formatDate(plan.start_date)} – {formatDate(plan.end_date)}
                          </p>
                        </div>
                        <p className="mt-1 text-sm capitalize text-[var(--color-ink-500)]">
                          {plan.cooking_frequency.replace(/_/g, " ")} · {capitalize(plan.status)}
                        </p>
                      </div>
                      <Link
                        href={`/planner/${plan.id}`}
                        className="shrink-0 rounded-full border border-[var(--color-sand-deep)] px-4 py-1.5 text-sm font-semibold text-[var(--color-ink)]"
                      >
                        View plan →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-warm-white)] p-10 text-center">
              <p className="font-heading text-xl text-[var(--color-ink)]">No meal plans yet for {displayName}.</p>
              <Link
                href={`/planner/new?dog_id=${dog.id}`}
                className="mt-6 inline-block rounded-full bg-[var(--color-coral)] px-6 py-3 text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
              >
                Create a plan →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
