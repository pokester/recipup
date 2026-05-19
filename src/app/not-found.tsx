import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--color-oat)] flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="eyebrow mb-4 text-[var(--color-coral)]">404</p>
        <h2 className="font-heading text-3xl text-[var(--color-ink)] mb-3">
          Page not found.
        </h2>
        <p className="text-base text-[var(--color-ink-500)] mb-8">
          This page doesn&apos;t exist or may have moved.
        </p>
        <Link
          href="/"
          className="bg-[var(--color-coral)] text-[var(--color-warm-white)] rounded-full px-6 py-3 font-medium hover:bg-[var(--color-coral-dark)] transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
