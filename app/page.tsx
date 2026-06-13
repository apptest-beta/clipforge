'use client'

import Link from 'next/link'
import { Scissors, Sparkles, Gamepad2, Trophy } from 'lucide-react'
import { FadeIn, Reveal, StaggerContainer, StaggerItem, HoverLift, MotionButton } from '@/components/motion/motion-primitives'

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
        <Icon size={24} style={{ color: '#C9A84C', marginBottom: '16px' }} />
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
    <div style={{ background: '#0A0A0A', minHeight: '100vh' }}>

      {/* Hero Section */}
      <section style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>

        {/* Ambient warm backdrop */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 900px 480px at 50% 35%, rgba(201,168,76,0.07) 0%, transparent 65%)' }} />

        {/* Grain texture */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, opacity: 0.025, mixBlendMode: 'overlay', backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`, backgroundSize: '256px 256px' }} />

        {/* Content z-10 */}
        <div style={{ position: 'relative', zIndex: 10, maxWidth: '720px', width: '100%' }}>

          {/* Badge */}
          <FadeIn delay={0}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(201,168,76,0.08)', border: '1px solid #C9A84C', borderRadius: '999px', padding: '4px 14px', fontSize: '0.68rem', letterSpacing: '0.1em', color: '#C9A84C', textTransform: 'uppercase', marginBottom: '32px' }}>
              ✦ AI-Powered Clip Detection
            </div>
          </FadeIn>

          {/* Headline */}
          <FadeIn delay={80}>
            <h1 className="font-display" style={{ fontSize: 'clamp(2.8rem, 7vw, 5rem)', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.03em', color: '#F2F2F2', marginBottom: '24px' }}>
              Find Your Best<br />
              <span style={{ color: '#C9A84C' }}>Gaming Moments</span>
            </h1>
          </FadeIn>

          {/* Subtext */}
          <FadeIn delay={160}>
            <p style={{ color: '#888888', fontSize: '1rem', lineHeight: 1.7, maxWidth: '460px', margin: '0 auto 36px' }}>
              Upload your gameplay. Our AI finds the kills, clutches, and highlights automatically.
            </p>
          </FadeIn>

          {/* Buttons */}
          <FadeIn delay={240}>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <MotionButton
                onClick={handleGuest}
                style={{ border: '1px solid #C9A84C', color: '#C9A84C', background: 'transparent', padding: '12px 28px', borderRadius: '6px', fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer', transition: 'background 150ms, color 150ms' }}
                onMouseEnter={e => { (e.target as HTMLElement).style.background = '#C9A84C'; (e.target as HTMLElement).style.color = '#0A0A0A' }}
                onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; (e.target as HTMLElement).style.color = '#C9A84C' }}
              >
                Try Demo
              </MotionButton>
              <Link href="/login" style={{ border: '1px solid #2A2A2A', color: '#F2F2F2', background: 'transparent', padding: '12px 28px', borderRadius: '6px', fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', transition: 'background 150ms' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1F1F1F')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                Sign In
              </Link>
            </div>
          </FadeIn>

          {/* Divider */}
          <div style={{ width: '120px', height: '1px', background: '#1F1F1F', margin: '48px auto 24px' }} />

          {/* Stat pills */}
          <FadeIn delay={320}>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {['2GB Max Upload', '9+ Games', 'Powered by Gemini'].map(stat => (
                <span key={stat} style={{ background: '#111111', border: '1px solid #2A2A2A', borderRadius: '999px', padding: '6px 16px', fontSize: '0.72rem', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {stat}
                </span>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid #1F1F1F', margin: 0 }} />

      {/* Features Section */}
      <section style={{ background: '#0A0A0A', padding: '96px 24px' }}>
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
      <section style={{ background: '#0A0A0A', padding: '96px 24px', borderTop: '1px solid #1F1F1F' }}>
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
                  <div className="font-display" style={{ fontSize: '2.5rem', fontWeight: 700, color: '#C9A84C', lineHeight: 1, marginBottom: '16px' }}>0{i + 1}</div>
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
        <section style={{ background: '#0A0A0A', padding: '56px 24px', borderTop: '1px solid #1F1F1F', borderBottom: '1px solid #1F1F1F', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', letterSpacing: '0.14em', color: '#555555', textTransform: 'uppercase', marginBottom: '20px' }}>WORKS WITH</div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Valorant', 'CS2', 'Fortnite', 'Apex Legends', 'Call of Duty', 'Minecraft', 'Rocket League', 'GTA V'].map(game => (
              <span key={game} style={{ background: '#111111', border: '1px solid #2A2A2A', borderRadius: '4px', padding: '5px 14px', fontSize: '0.78rem', color: '#999999' }}>{game}</span>
            ))}
          </div>
        </section>
      </Reveal>

      {/* Footer */}
      <footer style={{ background: '#0A0A0A', borderTop: '1px solid #1F1F1F', padding: '32px 24px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#F2F2F2' }}>
            <Scissors size={16} style={{ color: '#C9A84C' }} />
            ClipForge
          </div>
          <span style={{ color: '#555555', fontSize: '0.85rem' }}>Built for gamers.</span>
        </div>
      </footer>

    </div>
  )
}
