"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Dog = { id: string; name: string; breed?: string | null };

function toTitleCase(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

export function DogsDropdown({ dogs }: { dogs: Dog[] }) {
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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
      >
        My Dogs
        <svg
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-9 z-30 min-w-[220px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-warm-white)] p-2 shadow-lg">
          {dogs.length === 0 ? (
            <p className="px-3 py-2 text-sm text-[var(--color-ink-soft)]">No dogs yet</p>
          ) : (
            dogs.map((dog) => (
              <Link
                key={dog.id}
                href={`/dogs/${dog.id}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--color-sand)]"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-sand-deep)] font-serif text-xs font-semibold text-[var(--color-coral)]">
                  {toTitleCase(dog.name).slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--color-ink)]">
                    {toTitleCase(dog.name)}
                  </p>
                  {dog.breed && (
                    <p className="truncate text-xs text-[var(--color-ink-soft)]">
                      {dog.breed.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </p>
                  )}
                </div>
              </Link>
            ))
          )}
          <div className="mx-3 my-1 border-t border-[var(--color-border)]" />
          <Link
            href="/dogs"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm font-medium text-[var(--color-coral)] transition-colors hover:bg-[var(--color-sand)]"
          >
            Manage dogs →
          </Link>
        </div>
      )}
    </div>
  );
}
