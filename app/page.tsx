'use client'

import { Scissors, Sparkles, Gamepad2, Trophy } from 'lucide-react'
import { Reveal, StaggerContainer, StaggerItem, HoverLift } from '@/components/motion/motion-primitives'
import Hero from '@/components/ui/animated-shader-hero'

function handleGuest() {
  document.cookie = 'cf_guest=1; path=/; max-age=86400; SameSite=Lax'
  try { localStorage.setItem('cf_guest', '1') } catch {}
  window.location.href = '/dashboard'
}

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI Detection',
    desc: 'Gemini AI scans your footage and automatically timestamps every kill, clutch, and highlight.',
  },
  {
    icon: Scissors,
    title: 'One-Click Cutting',
    desc: 'Select a moment and cut it to a shareable clip in seconds. No editing skills required.',
  },
  {
    icon: Gamepad2,
    title: 'Any Game',
    desc: 'Works with Valorant, CS2, Fortnite, Apex, and more. Upload and let the AI do the rest.',
  },
  {
    icon: Trophy,
    title: 'Clip History',
    desc: 'All your saved clips in one place. Review, re-cut, and share whenever you want.',
  },
]

const STEPS = [
  {
    title: 'Upload Your Clip',
    desc: 'Drop in any gameplay video up to 2GB. MP4, MOV, WebM all supported.',
  },
  {
    title: 'AI Finds the Moments',
    desc: 'Our AI watches your footage and pinpoints the most exciting moments with timestamps.',
  },
  {
    title: 'Cut & Download',
    desc: 'Review the detected highlights, cut the ones you want, and download them instantly.',
  },
]

function FeatureCard({ feature }: { feature: typeof FEATURES[0] }) {
  const Icon = feature.icon
  return (
    <HoverLift>
      <div
        style={{
          background: '#111111',
          border: '1px solid #1F1F1F',
          borderRadius: '8px',
          padding: '24px',
          cursor: 'default',
          height: '100%',
        }}
      >
        <Icon size={24} style={{ color: '#F97316', marginBottom: '16px' }} />
        <h3 style={{ color: '#F2F2F2', fontWeight: 600, fontSize: '1rem', marginBottom: '8px', letterSpacing: '-0.02em' }}>
          {feature.title}
        </h3>
        <p style={{ color: '#888888', fontSize: '0.9rem', lineHeight: 1.6 }}>{feature.desc}</p>
      </div>
    </HoverLift>
  )
}

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh' }}>

      {/* Hero Section */}
      <Hero
        trustBadge={{ text: 'AI-Powered Clip Detection', icons: ['✦'] }}
        headline={{ line1: 'Find Your Best', line2: 'Gaming Moments' }}
        subtitle="Upload your gameplay. Our AI finds the kills, clutches, and highlights automatically."
        buttons={{
          primary: { text: 'Try Demo', onClick: handleGuest },
          secondary: { text: 'Sign In', onClick: () => { window.location.href = '/login' } },
        }}
      />

      <hr style={{ border: 'none', borderTop: '1px solid #1F1F1F', margin: 0 }} />

      {/* Features Section */}
      <section style={{ padding: '96px 24px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', textAlign: 'center' }}>
          <h2 className="font-display" style={{ fontSize: '2rem', fontWeight: 600, color: '#F2F2F2', letterSpacing: '-0.02em' }}>Everything you need</h2>
          <p style={{ color: '#888888', fontSize: '0.95rem', maxWidth: '460px', margin: '12px auto 48px', lineHeight: 1.6 }}>
            Built for players who want highlights without the editing.
          </p>
          <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' } as React.CSSProperties}>
            {FEATURES.map((f) => (
              <StaggerItem key={f.title}>
                <FeatureCard feature={f} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* How It Works Section */}
      <section style={{ padding: '96px 24px', borderTop: '1px solid #1F1F1F' }}>
        <div style={{ maxWidth: '880px', margin: '0 auto', textAlign: 'center' }}>
          <h2 className="font-display" style={{ fontSize: '2rem', fontWeight: 600, color: '#F2F2F2', letterSpacing: '-0.02em' }}>How it works</h2>
          <p style={{ color: '#888888', fontSize: '0.95rem', maxWidth: '460px', margin: '12px auto 48px', lineHeight: 1.6 }}>
            Three steps. Zero editing experience required.
          </p>
          <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0' } as React.CSSProperties}>
            {STEPS.map((step, i) => (
              <StaggerItem key={i}>
                <div style={{ padding: '40px 32px', borderRight: i < 2 ? '1px solid #1F1F1F' : 'none', textAlign: 'left' }}>
                  <div style={{ fontSize: '0.62rem', letterSpacing: '0.14em', color: '#555555', textTransform: 'uppercase', marginBottom: '8px' }}>STEP</div>
                  <div className="font-display" style={{ fontSize: '2.5rem', fontWeight: 700, color: '#F97316', lineHeight: 1, marginBottom: '16px' }}>0{i + 1}</div>
                  <h3 className="font-display" style={{ fontWeight: 600, color: '#F2F2F2', marginBottom: '8px', fontSize: '1.05rem' }}>{step.title}</h3>
                  <p style={{ color: '#888888', fontSize: '0.88rem', lineHeight: 1.6 }}>{step.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Supported Games Section */}
      <Reveal>
        <section style={{ padding: '56px 24px', borderTop: '1px solid #1F1F1F', borderBottom: '1px solid #1F1F1F', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', letterSpacing: '0.14em', color: '#555555', textTransform: 'uppercase', marginBottom: '20px' }}>WORKS WITH</div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Valorant', 'CS2', 'Fortnite', 'Apex Legends', 'Call of Duty', 'Minecraft', 'Rocket League', 'GTA V'].map(game => (
              <span key={game} style={{ background: '#111111', border: '1px solid #2A2A2A', borderRadius: '4px', padding: '5px 14px', fontSize: '0.78rem', color: '#999999' }}>{game}</span>
            ))}
          </div>
        </section>
      </Reveal>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #1F1F1F', padding: '32px 24px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#F2F2F2' }}>
            <Scissors size={16} style={{ color: '#F97316' }} />
            ClipForge
          </div>
          <span style={{ color: '#555555', fontSize: '0.85rem' }}>Built for gamers.</span>
        </div>
      </footer>

    </div>
  )
}
