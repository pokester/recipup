"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export function UserMenu({ user }: { user: User }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  };

  const initials =
    user.user_metadata?.full_name
      ? (user.user_metadata.full_name as string)
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : (user.email?.[0] ?? "?").toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-accent)] text-sm font-semibold text-[var(--color-cream)] transition-opacity hover:opacity-80"
        aria-label="Account menu"
      >
        {user.user_metadata?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.user_metadata.avatar_url as string}
            alt="Avatar"
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 w-52 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] py-2 shadow-lg">
          <div className="border-b border-[var(--color-border)] px-4 pb-2">
            <p className="truncate text-xs font-semibold text-[var(--color-ink)]">
              {(user.user_metadata?.full_name as string) || user.email}
            </p>
            {user.user_metadata?.full_name && (
              <p className="truncate text-xs text-[var(--color-ink-soft)]">{user.email}</p>
            )}
          </div>

          <nav className="pt-1">
            <Link
              href="/dogs"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-[var(--color-ink)] hover:bg-[var(--color-cream-soft)]"
            >
              My dogs →
            </Link>
            <Link
              href="/pantry"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-[var(--color-ink)] hover:bg-[var(--color-cream-soft)]"
            >
              My kitchen →
            </Link>
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-[var(--color-ink)] hover:bg-[var(--color-cream-soft)]"
            >
              Account →
            </Link>
            <div className="my-1 border-t border-[var(--color-border)]" />
            <button
              type="button"
              onClick={handleSignOut}
              className="block w-full px-4 py-2 text-left text-sm text-[var(--color-ink-soft)] hover:bg-[var(--color-cream-soft)]"
            >
              Sign out
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
