"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AccountClient({ userEmail }: { userEmail: string }) {
  const [resetSent, setResetSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResetPassword = async () => {
    setSending(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        const message = resetError.message.toLowerCase().includes("rate limit")
          ? "Too many reset emails have been requested. Please wait a few minutes and try again."
          : "We could not send the reset email. Please try again.";
        setError(message);
        return;
      }

      setResetSent(true);
    } catch {
      setError("We could not send the reset email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-5 border-t border-[var(--color-border)] pt-4">
      {resetSent ? (
        <p className="text-sm text-[var(--color-ink-soft)]">
          Check your inbox — the link is on its way. It may take a minute or two.
        </p>
      ) : (
        <>
          <button
            type="button"
            onClick={handleResetPassword}
            disabled={sending}
            className="text-sm font-semibold text-[var(--color-accent)] hover:underline disabled:opacity-50"
          >
            {sending ? "Sending..." : "Change password →"}
          </button>
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        </>
      )}
    </div>
  );
}
