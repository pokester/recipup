"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function DeleteAccountPage() {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = confirmation === "DELETE";

  const handleDelete = async () => {
    if (!isConfirmed || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/delete-account", { method: "POST" });
      if (!res.ok) throw new Error("Delete failed");
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
    } catch {
      setError("Something went wrong. Please try again or contact us at hello@recipup.co.");
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-6 py-16 md:px-8">
      <Link href="/account" className="mb-8 inline-block text-sm font-semibold text-[var(--color-ink-soft)] hover:text-[var(--color-accent)]">
        ← Back to account
      </Link>

      <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
        <h1 className="font-heading text-2xl text-red-900">Delete your account</h1>
        <p className="mt-3 text-sm text-red-800">
          Are you sure? This will permanently delete your account, all dog profiles, recipes, and health history.
          <strong> This cannot be undone.</strong>
        </p>

        <div className="mt-6">
          <label className="block text-sm font-semibold text-red-900">
            Type <span className="font-mono">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="DELETE"
            className="mt-2 h-12 w-full rounded-full border border-red-300 bg-white px-5 text-red-900 outline-none placeholder:text-red-300 focus:border-red-500"
          />
        </div>

        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleDelete}
            disabled={!isConfirmed || deleting}
            className="flex-1 rounded-full bg-red-700 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {deleting ? "Deleting..." : "Delete my account"}
          </button>
          <Link
            href="/account"
            className="flex-1 rounded-full border border-red-300 py-3 text-center text-sm font-semibold text-red-700"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
