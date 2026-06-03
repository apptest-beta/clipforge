import Link from 'next/link'
import { Sparkles, Scissors, Gamepad2 } from 'lucide-react'

export default function LandingPage() {
  return (
    <div style={{ background: '#0A0A0A', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>

      {/* Hero Section */}
      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '0 24px',
          borderBottom: '1px solid #1F1F1F',
        }}
      >
        {/* Pill badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(201,168,76,0.08)',
            border: '1px solid #C9A84C',
            borderRadius: '999px',
            padding: '4px 12px',
            marginBottom: '28px',
            color: '#C9A84C',
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 500,
          }}
        >
          ✦ AI-Powered Clip Detection
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            marginBottom: '24px',
          }}
        >
          <span style={{ color: '#F2F2F2', display: 'block' }}>Find Your Best</span>
          <span style={{ color: '#C9A84C', display: 'block' }}>Gaming Moments</span>
        </h1>

        {/* Subtext */}
        <p
          style={{
            color: '#888888',
            maxWidth: '480px',
            lineHeight: 1.6,
            fontSize: '1rem',
            marginBottom: '40px',
          }}
        >
          Upload your gameplay. Our AI finds the kills, clutches, and highlights automatically.
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link
            href="/upload"
            style={{
              border: '1px solid #C9A84C',
              color: '#C9A84C',
              background: 'transparent',
              padding: '12px 28px',
              borderRadius: '6px',
              fontWeight: 500,
              fontSize: '0.95rem',
              textDecoration: 'none',
              transition: 'background 0.15s, color 0.15s',
            }}
            className="btn-primary"
          >
            Start for Free
          </Link>
          <Link
            href="/login"
            style={{
              border: '1px solid #2A2A2A',
              color: '#F2F2F2',
              background: 'transparent',
              padding: '12px 28px',
              borderRadius: '6px',
              fontWeight: 500,
              fontSize: '0.95rem',
              textDecoration: 'none',
              transition: 'background 0.15s',
            }}
            className="btn-secondary"
          >
            Sign In
          </Link>
        </div>

        <style>{`
          .btn-primary:hover { background: #C9A84C !important; color: #0A0A0A !important; }
          .btn-secondary:hover { background: #1F1F1F !important; }
        `}</style>
      </section>

      {/* Features Section */}
      <section style={{ padding: '80px 24px', maxWidth: '1100px', margin: '0 auto' }}>
        <h2
          style={{
            textAlign: 'center',
            fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            fontWeight: 600,
            color: '#F2F2F2',
            letterSpacing: '-0.02em',
            marginBottom: '48px',
          }}
        >
          Everything you need
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
          }}
        >
          {/* Feature 1 */}
          <div
            style={{
              background: '#111111',
              border: '1px solid #1F1F1F',
              borderRadius: '8px',
              padding: '24px',
            }}
          >
            <Sparkles style={{ color: '#C9A84C', marginBottom: '16px', width: '24px', height: '24px' }} />
            <h3 style={{ color: '#F2F2F2', fontWeight: 600, fontSize: '1rem', marginBottom: '8px', letterSpacing: '-0.02em' }}>
              AI Moment Detection
            </h3>
            <p style={{ color: '#888888', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Gemini AI scans your footage and automatically timestamps every kill, clutch, and highlight.
            </p>
          </div>

          {/* Feature 2 */}
          <div
            style={{
              background: '#111111',
              border: '1px solid #1F1F1F',
              borderRadius: '8px',
              padding: '24px',
            }}
          >
            <Scissors style={{ color: '#C9A84C', marginBottom: '16px', width: '24px', height: '24px' }} />
            <h3 style={{ color: '#F2F2F2', fontWeight: 600, fontSize: '1rem', marginBottom: '8px', letterSpacing: '-0.02em' }}>
              One-Click Cutting
            </h3>
            <p style={{ color: '#888888', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Select a moment and cut it to a shareable clip in seconds. No editing skills required.
            </p>
          </div>

          {/* Feature 3 */}
          <div
            style={{
              background: '#111111',
              border: '1px solid #1F1F1F',
              borderRadius: '8px',
              padding: '24px',
            }}
          >
            <Gamepad2 style={{ color: '#C9A84C', marginBottom: '16px', width: '24px', height: '24px' }} />
            <h3 style={{ color: '#F2F2F2', fontWeight: 600, fontSize: '1rem', marginBottom: '8px', letterSpacing: '-0.02em' }}>
              Any Game, Any Moment
            </h3>
            <p style={{ color: '#888888', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Works with Valorant, CS2, Fortnite, Apex, and more. Upload and let the AI do the rest.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section style={{ padding: '80px 24px', maxWidth: '1100px', margin: '0 auto' }}>
        <h2
          style={{
            textAlign: 'center',
            fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            fontWeight: 600,
            color: '#F2F2F2',
            letterSpacing: '-0.02em',
            marginBottom: '48px',
          }}
        >
          How it works
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '0',
          }}
        >
          {/* Step 1 */}
          <div
            style={{
              padding: '32px 40px',
              borderRight: '1px solid #1F1F1F',
            }}
          >
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#C9A84C', lineHeight: 1, marginBottom: '16px' }}>
              01
            </div>
            <h3 style={{ color: '#F2F2F2', fontWeight: 600, fontSize: '1rem', marginBottom: '8px', letterSpacing: '-0.02em' }}>
              Upload Your Clip
            </h3>
            <p style={{ color: '#888888', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Drop in any gameplay video up to 2GB. MP4, MOV, WebM all supported.
            </p>
          </div>

          {/* Step 2 */}
          <div
            style={{
              padding: '32px 40px',
              borderRight: '1px solid #1F1F1F',
            }}
          >
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#C9A84C', lineHeight: 1, marginBottom: '16px' }}>
              02
            </div>
            <h3 style={{ color: '#F2F2F2', fontWeight: 600, fontSize: '1rem', marginBottom: '8px', letterSpacing: '-0.02em' }}>
              AI Finds the Moments
            </h3>
            <p style={{ color: '#888888', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Our AI watches your footage and pinpoints the most exciting moments with timestamps.
            </p>
          </div>

          {/* Step 3 */}
          <div
            style={{
              padding: '32px 40px',
            }}
          >
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#C9A84C', lineHeight: 1, marginBottom: '16px' }}>
              03
            </div>
            <h3 style={{ color: '#F2F2F2', fontWeight: 600, fontSize: '1rem', marginBottom: '8px', letterSpacing: '-0.02em' }}>
              Cut &amp; Download
            </h3>
            <p style={{ color: '#888888', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Review the detected highlights, cut the ones you want, and download them instantly.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid #1F1F1F',
          background: '#0A0A0A',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Scissors style={{ color: '#C9A84C', width: '18px', height: '18px' }} />
          <span style={{ color: '#F2F2F2', fontWeight: 600, fontSize: '0.95rem' }}>ClipForge</span>
        </div>
        <span style={{ color: '#555555', fontSize: '0.85rem' }}>Built for gamers.</span>
      </footer>
    </div>
  )
}
