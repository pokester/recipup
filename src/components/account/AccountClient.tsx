"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AccountClient({ userEmail }: { userEmail: string }) {
  const [resetSent, setResetSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleResetPassword = async () => {
    setSending(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetSent(true);
    setSending(false);
  };

  return (
    <div className="mt-5 border-t border-[var(--color-border)] pt-4">
      {resetSent ? (
        <p className="text-sm text-[var(--color-ink-soft)]">
          Check your inbox — the link is on its way. It may take a minute or two.
        </p>
      ) : (
        <button
          type="button"
          onClick={handleResetPassword}
          disabled={sending}
          className="text-sm font-semibold text-[var(--color-accent)] hover:underline disabled:opacity-50"
        >
          {sending ? "Sending..." : "Change password →"}
        </button>
      )}
    </div>
  );
}
