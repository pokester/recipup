'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-oat flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h2 className="font-serif text-3xl text-ink mb-3">
          Something went wrong.
        </h2>
        <p className="font-sans text-base text-muted mb-8">
          An unexpected error occurred. Try refreshing the page — if it keeps
          happening, contact us at hello@recipup.com
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="bg-coral text-white rounded-full px-6 py-3 font-sans font-medium hover:bg-coral-light transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="border border-ink/20 rounded-full px-6 py-3 font-sans font-medium text-ink hover:bg-ink/5 transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
