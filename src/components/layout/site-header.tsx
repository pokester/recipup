import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[color:color-mix(in_oklab,var(--color-cream)_90%,white)]/95 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 md:px-10">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <Logo />
        </Link>
        <div className="hidden items-center gap-7 text-sm text-[var(--color-ink-soft)] md:flex">
          <Link href="#" className="transition-colors hover:text-[var(--color-accent)]">
            How it works
          </Link>
          <Link href="#" className="transition-colors hover:text-[var(--color-accent)]">
            Recipes
          </Link>
          <Link href="#" className="transition-colors hover:text-[var(--color-accent)]">
            About
          </Link>
        </div>
      </nav>
    </header>
  );
}
