"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Props = {
  dogId: string;
  displayName: string;
  initials: string;
};

export function DeleteDogClient({ dogId, displayName, initials }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/delete-dog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dog_id: dogId }),
      });
      if (!res.ok) throw new Error("Delete failed");
      router.push("/dogs");
    } catch {
      setError("Something went wrong. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Dog identity */}
      <div className="flex items-center gap-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--color-coral)]/10">
          <span className="font-heading text-2xl font-semibold text-[var(--color-coral)]">{initials}</span>
        </div>
        <div>
          <h1 className="font-heading text-2xl text-[var(--color-ink)]">{displayName}</h1>
          <p className="mt-0.5 text-sm text-[var(--color-ink-500)]">Profile and all associated data</p>
        </div>
      </div>

      {/* What gets removed */}
      <div className="rounded-2xl border border-[var(--color-sand-deep)] bg-[var(--color-sand)] px-6 py-5">
        <p className="text-sm font-semibold text-[var(--color-ink)]">This will remove:</p>
        <ul className="mt-3 space-y-1.5 text-sm text-[var(--color-ink-500)]">
          <li>{displayName}&apos;s profile and settings</li>
          <li>All saved recipes for {displayName}</li>
          <li>All health logs and tracking history</li>
          <li>All meal plans</li>
        </ul>
      </div>

      {error && (
        <p className="text-sm text-[var(--color-coral)]">{error}</p>
      )}

      {/* Actions: safe action is primary */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          href={`/dogs/${dogId}`}
          className="rounded-full bg-[var(--color-coral)] px-7 py-3 text-center text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
        >
          Keep {displayName}
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-full border border-[var(--color-sand-deep)] px-7 py-3 text-sm font-semibold text-[var(--color-ink-500)] transition-colors hover:border-[var(--color-ink-300)] hover:text-[var(--color-ink)] disabled:opacity-40"
        >
          {deleting ? "Removing..." : `Delete ${displayName}'s profile`}
        </button>
      </div>
    </div>
  );
}
