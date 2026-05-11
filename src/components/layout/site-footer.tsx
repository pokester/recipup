import Link from "next/link";
import { DarkWordmark } from "@/components/ui/logo";

export function SiteFooter() {
  return (
    <footer className="bg-[var(--color-ink-900)]">
      <div className="mx-auto max-w-6xl px-6 py-16 md:px-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <DarkWordmark />
            <p className="mt-3 text-sm text-[var(--color-warm-white)]/60">
              Real recipes. Happy dogs.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-warm-white)]/40">
              Product
            </p>
            <ul className="mt-4 space-y-2">
              {[
                { label: "How it works", href: "/#how-it-works" },
                { label: "Recipes", href: "/recipes" },
                { label: "Meal planner", href: "/planner" },
                { label: "Library", href: "/library" },
                { label: "Pricing", href: "/pricing" },
              ].map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-[var(--color-warm-white)]/70 transition-colors hover:text-[var(--color-warm-white)]"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-warm-white)]/40">
              Company
            </p>
            <ul className="mt-4 space-y-2">
              {[
                { label: "About", href: "/about" },
                { label: "Contact", href: "mailto:hello@recipup.co" },
              ].map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-[var(--color-warm-white)]/70 transition-colors hover:text-[var(--color-warm-white)]"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-warm-white)]/40">
              Legal
            </p>
            <ul className="mt-4 space-y-2">
              {[
                { label: "Privacy policy", href: "/privacy" },
                { label: "Terms of use", href: "/terms" },
              ].map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-[var(--color-warm-white)]/70 transition-colors hover:text-[var(--color-warm-white)]"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-[var(--color-warm-white)]/40">
              Shopping links may earn us a small commission at no cost to you.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-2 border-t border-[var(--color-warm-white)]/10 pt-8 sm:flex-row">
          <p className="text-xs text-[var(--color-warm-white)]/40">
            © 2026 Recipup. All rights reserved.
          </p>
          <p className="text-xs text-[var(--color-warm-white)]/40">
            Personalised nutrition for every dog.
          </p>
        </div>
      </div>
    </footer>
  );
}
