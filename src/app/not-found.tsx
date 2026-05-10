import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-oat flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="font-sans text-xs font-semibold tracking-widest uppercase text-coral mb-4">
          404
        </p>
        <h2 className="font-serif text-3xl text-ink mb-3">
          Page not found.
        </h2>
        <p className="font-sans text-base text-muted mb-8">
          This page doesn&apos;t exist or may have moved.
        </p>
        <Link
          href="/"
          className="bg-coral text-white rounded-full px-6 py-3 font-sans font-medium hover:bg-coral-light transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
