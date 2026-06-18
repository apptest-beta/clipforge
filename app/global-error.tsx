'use client'

// Root-level error boundary. Unlike app/(app)/error.tsx, this catches errors
// thrown in the root layout itself, so it must render its own <html>/<body>
// and cannot rely on globals.css (the root layout is bypassed when it renders).
// Styles are therefore inline and self-contained.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0A0A0A',
          color: '#fafafa',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
          <p
            style={{
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#a1a1aa',
              marginBottom: '0.75rem',
            }}
          >
            Something went wrong
          </p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.75rem' }}>
            The app hit an unexpected error
          </h1>
          <p style={{ color: '#a1a1aa', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
            Try again — if it keeps happening, refresh the page or come back in a moment.
          </p>
          {error?.digest && (
            <p style={{ color: '#52525b', fontSize: '0.75rem', marginBottom: '1.5rem' }}>
              Error reference: {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            style={{
              cursor: 'pointer',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#0A0A0A',
              backgroundColor: '#fafafa',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
