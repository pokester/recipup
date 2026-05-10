'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          padding: '24px',
          textAlign: 'center',
          backgroundColor: '#F7F3ED'
        }}>
          <div>
            <h2 style={{
              fontSize: '28px',
              marginBottom: '12px',
              color: '#2C2416'
            }}>
              Something went wrong.
            </h2>
            <p style={{
              color: '#8A7E72',
              marginBottom: '24px'
            }}>
              Please refresh the page.
            </p>
            <button
              onClick={reset}
              style={{
                background: '#C4614A',
                color: 'white',
                border: 'none',
                borderRadius: '999px',
                padding: '12px 24px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
