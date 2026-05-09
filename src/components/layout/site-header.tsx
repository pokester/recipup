import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { UserMenu } from "@/components/layout/user-menu";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  let user = null;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[color:color-mix(in_oklab,var(--color-cream)_90%,white)]/95 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 md:px-10">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <Logo height={48} />
        </Link>

        {user ? (
          <div className="flex items-center gap-6">
            <div className="hidden items-center gap-7 text-sm text-[var(--color-ink-soft)] md:flex">
              <Link
                href="/library"
                className="transition-colors hover:text-[var(--color-accent)]"
              >
                My Recipes
              </Link>
              <Link
                href="/planner"
                className="flex items-center gap-2 transition-colors hover:text-[var(--color-accent)]"
              >
                Meal Planner
                <span className="rounded-full bg-[var(--color-accent)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--color-accent)]">
                  Pack
                </span>
              </Link>
            </div>
            <UserMenu user={user} />
          </div>
        ) : (
          <div className="flex items-center gap-6">
            <div className="hidden items-center gap-7 text-sm text-[var(--color-ink-soft)] md:flex">
              <Link
                href="/#how-it-works"
                className="transition-colors hover:text-[var(--color-accent)]"
              >
                How it works
              </Link>
              <Link
                href="/recipes"
                className="transition-colors hover:text-[var(--color-accent)]"
              >
                Recipes
              </Link>
              <Link
                href="/about"
                className="transition-colors hover:text-[var(--color-accent)]"
              >
                About
              </Link>
              <Link
                href="/pricing"
                className="transition-colors hover:text-[var(--color-accent)]"
              >
                Pricing
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-accent)]"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-[var(--color-cream)] transition-transform hover:-translate-y-0.5"
              >
                Get started →
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
