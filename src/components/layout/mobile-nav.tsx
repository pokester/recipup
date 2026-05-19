"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Dog = { id: string; name: string; breed: string | null };

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function MobileNav({ user, dogs }: { user: User | null; dogs: Dog[] }) {
  const [open, setOpen] = useState(false);
  const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Create a dedicated portal container. Removal is deferred so React can finish
  // removing portal children before we pull the container out of the DOM.
  useEffect(() => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPortalEl(el);
    return () => {
      setTimeout(() => {
        if (el.isConnected) el.remove();
      }, 0);
    };
  }, []);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Close on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.refresh();
    router.push("/");
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const linkClass = (href: string) =>
    `block px-6 py-3 text-base font-medium transition-colors ${
      isActive(href)
        ? "text-[var(--color-ink)] font-semibold"
        : "text-[var(--color-ink-500)] hover:text-[var(--color-ink)]"
    }`;

  const overlay = (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-[var(--color-ink)]/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed inset-y-0 right-0 z-50 w-72 bg-[var(--color-warm-white)] shadow-[var(--shadow-lift)] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="flex h-full flex-col overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
            <span className="font-heading text-sm font-semibold text-[var(--color-ink)]">
              Menu
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-ink-300)] transition-colors hover:text-[var(--color-ink)]"
              aria-label="Close menu"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" d="M4 4l12 12M16 4L4 16" />
              </svg>
            </button>
          </div>

          {/* Nav links */}
          <nav className="flex-1 py-2">
            {user ? (
              <>
                {/* Dogs */}
                {dogs.length > 0 && (
                  <div className="px-6 pb-1 pt-3">
                    <p className="eyebrow mb-2">My dogs</p>
                    <div className="space-y-1">
                      {dogs.map((dog) => (
                        <Link
                          key={dog.id}
                          href={`/dogs/${dog.id}`}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-colors ${
                            pathname.startsWith(`/dogs/${dog.id}`)
                              ? "bg-[var(--color-sand)] text-[var(--color-ink)] font-semibold"
                              : "text-[var(--color-ink-500)] hover:bg-[var(--color-sand)] hover:text-[var(--color-ink)]"
                          }`}
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-coral)] font-heading text-xs font-semibold text-[var(--color-warm-white)]">
                            {initials(dog.name)}
                          </span>
                          <span className="text-sm font-medium">{capitalize(dog.name)}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-3 border-t border-[var(--color-border)] pt-2">
                  <Link href="/pantry" className={linkClass("/pantry")}>Kitchen</Link>
                  <Link href="/planner" className={linkClass("/planner")}>Planner</Link>
                  <Link href="/library" className={linkClass("/library")}>Library</Link>
                </div>

                <div className="mt-2 border-t border-[var(--color-border)] pt-2">
                  <Link href="/account" className={linkClass("/account")}>Account</Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="block w-full px-6 py-3 text-left text-base font-medium text-[var(--color-ink-500)] transition-colors hover:text-[var(--color-ink)]"
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link href="/#how-it-works" className={linkClass("/#how-it-works")}>How it works</Link>
                <Link href="/recipes" className={linkClass("/recipes")}>Recipes</Link>
                <Link href="/about" className={linkClass("/about")}>About</Link>
                <Link href="/pricing" className={linkClass("/pricing")}>Pricing</Link>

                <div className="mt-4 border-t border-[var(--color-border)] px-6 pt-4 space-y-3">
                  <Link
                    href="/login"
                    className="block rounded-full border border-[var(--color-sand-deep)] px-5 py-2.5 text-center text-sm font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-sand)]"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className="block rounded-full bg-[var(--color-coral)] px-5 py-2.5 text-center text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
                  >
                    Get started →
                  </Link>
                </div>
              </>
            )}
          </nav>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Hamburger button — stays inside the header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-ink-500)] transition-colors hover:text-[var(--color-ink)] md:hidden"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        {open ? (
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" d="M4 4l12 12M16 4L4 16" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" d="M3 5h14M3 10h14M3 15h14" />
          </svg>
        )}
      </button>

      {portalEl && createPortal(overlay, portalEl)}
    </>
  );
}
