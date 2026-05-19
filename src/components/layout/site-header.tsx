import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { UserMenu } from "@/components/layout/user-menu";
import { DogsDropdown } from "@/components/layout/dogs-dropdown";
import { MobileNav } from "@/components/layout/mobile-nav";
import { createClient } from "@/lib/supabase/server";
import { withTimeout } from "@/lib/async";

export async function SiteHeader() {
  let user = null;
  let dogs: { id: string; name: string; breed: string | null }[] = [];

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const supabase = await createClient();
      const { data } = await withTimeout(
        supabase.auth.getUser(),
        5000,
        "Header auth check timed out",
      );
      user = data.user;
      if (user) {
        const { data: dogRows } = await withTimeout(
          supabase
            .from("dogs")
            .select("id, name, breed")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .order("created_at", { ascending: false }),
          5000,
          "Header dogs query timed out",
        );
        dogs = (dogRows ?? []) as { id: string; name: string; breed: string | null }[];
      }
    } catch {
      user = null;
      dogs = [];
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-warm-white)]/95 backdrop-blur-sm">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 md:px-10">
        <Link href={user ? "/dashboard" : "/"} className="transition-opacity hover:opacity-80">
          <Logo height={44} />
        </Link>

        {user ? (
          <div className="flex items-center gap-3 md:gap-6">
            <div className="hidden items-center gap-7 md:flex">
              <DogsDropdown dogs={dogs} />
              <Link
                href="/pantry"
                className="text-sm font-medium text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
              >
                Kitchen
              </Link>
              <Link
                href="/planner"
                className="text-sm font-medium text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
              >
                Planner
              </Link>
              <Link
                href="/library"
                className="text-sm font-medium text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
              >
                Library
              </Link>
            </div>
            <div className="hidden md:block">
              <UserMenu user={user} />
            </div>
            <MobileNav user={user} dogs={dogs} />
          </div>
        ) : (
          <div className="flex items-center gap-3 md:gap-6">
            <div className="hidden items-center gap-7 md:flex">
              <Link
                href="/#how-it-works"
                className="text-sm font-medium text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
              >
                How it works
              </Link>
              <Link
                href="/recipes"
                className="text-sm font-medium text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
              >
                Recipes
              </Link>
              <Link
                href="/about"
                className="text-sm font-medium text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
              >
                About
              </Link>
              <Link
                href="/pricing"
                className="text-sm font-medium text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
              >
                Pricing
              </Link>
            </div>
            <div className="hidden items-center gap-3 md:flex">
              <Link
                href="/login"
                className="text-sm font-medium text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-[var(--color-coral)] px-5 py-2 text-sm font-semibold text-[var(--color-warm-white)] transition-transform hover:-translate-y-0.5"
              >
                Get started →
              </Link>
            </div>
            <MobileNav user={null} dogs={[]} />
          </div>
        )}
      </nav>
    </header>
  );
}
