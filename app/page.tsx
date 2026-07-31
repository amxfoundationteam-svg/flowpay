import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')

  return (
    <main className="min-h-screen bg-rx-bg text-rx-text overflow-x-hidden">

      {/* Ambient gold glow */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 70% 45% at 50% 38%, rgba(201,146,42,0.055) 0%, transparent 70%)'
      }} />

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-5"
        style={{ borderBottom: '1px solid rgba(201,146,42,0.15)', background: 'rgba(8,8,7,0.82)', backdropFilter: 'blur(12px)' }}>
        <span className="font-serif text-xl tracking-widest text-rx-text select-none">
          RIVER <em className="not-italic text-gold">X</em>
        </span>
        <ul className="hidden md:flex gap-10 list-none m-0 p-0">
          {['Platform', 'Security', 'Pricing'].map(l => (
            <li key={l}>
              <span className="text-[10px] tracking-[0.22em] uppercase text-rx-muted cursor-default select-none">{l}</span>
            </li>
          ))}
        </ul>
        <Link href="/sign-up"
          className="text-[10px] tracking-[0.2em] uppercase text-gold px-5 py-2.5 transition-colors hover:bg-gold/10"
          style={{ border: '1px solid rgba(201,146,42,0.3)' }}>
          Get Started
        </Link>
      </nav>

      {/* HERO */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-12">
        <div className="text-[10px] tracking-[0.32em] uppercase text-gold mb-8 flex items-center gap-4">
          <span className="inline-block w-10" style={{ height: '1px', background: 'rgba(201,146,42,0.3)' }} />
          Premium Payment Infrastructure
          <span className="inline-block w-10" style={{ height: '1px', background: 'rgba(201,146,42,0.3)' }} />
        </div>

        <h1 className="font-serif font-normal leading-none tracking-tight text-rx-text"
          style={{ fontSize: 'clamp(4.5rem, 12vw, 9rem)' }}>
          RIVER <em className="not-italic text-gold">X</em>
        </h1>

        <div className="my-7 mx-auto" style={{
          width: '4rem', height: '1px',
          background: 'linear-gradient(to right, transparent, rgba(201,146,42,0.7), transparent)'
        }} />

        <p className="text-[11px] tracking-[0.24em] uppercase text-rx-muted max-w-sm leading-loose">
          Move money across stablecoins, cards, and bank transfers — unified in one platform.
        </p>

        <div className="flex gap-3 mt-10">
          <Link href="/sign-up"
            className="text-[11px] tracking-[0.2em] uppercase font-semibold text-rx-bg bg-gold px-8 py-3.5 hover:bg-gold-light transition-colors">
            Open Account
          </Link>
          <Link href="/sign-in"
            className="text-[11px] tracking-[0.2em] uppercase text-gold px-8 py-3.5 hover:bg-gold/8 transition-colors"
            style={{ border: '1px solid rgba(201,146,42,0.3)' }}>
            Sign In
          </Link>
        </div>
      </section>

      {/* STATS */}
      <div style={{ borderTop: '1px solid rgba(201,146,42,0.15)', borderBottom: '1px solid rgba(201,146,42,0.15)' }}>
        <div className="max-w-4xl mx-auto grid grid-cols-3">
          {[
            { value: '$2.4B', label: 'Volume Processed' },
            { value: '99.9%', label: 'Uptime Guaranteed' },
            { value: '< 3s', label: 'Average Settlement' },
          ].map((s, i) => (
            <div key={s.label} className="py-10 text-center"
              style={{ borderRight: i < 2 ? '1px solid rgba(201,146,42,0.15)' : 'none' }}>
              <span className="block font-serif text-4xl font-normal text-gold tabular-nums">{s.value}</span>
              <span className="block text-[9px] tracking-[0.24em] uppercase text-rx-muted mt-2">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <section className="max-w-4xl mx-auto px-8 py-20">
        <div className="flex items-center gap-4 mb-12">
          <span className="text-[9px] tracking-[0.3em] uppercase text-gold">What We Offer</span>
          <div className="flex-1" style={{ height: '1px', background: 'rgba(201,146,42,0.15)' }} />
        </div>

        <div style={{ border: '1px solid rgba(201,146,42,0.18)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
          {[
            {
              title: 'Card Payments',
              desc: 'Accept Visa, Mastercard, and Amex with full 3DS authentication. Stripe-powered and PCI compliant.',
              icon: (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1">
                  <rect x="1" y="3" width="14" height="10" /><line x1="1" y1="6" x2="15" y2="6" />
                </svg>
              ),
            },
            {
              title: 'ACH & Bank',
              desc: 'Direct bank-to-bank transfers via Plaid. Instant verification, 1–3 day settlement, zero card fees.',
              icon: (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M2 8 C2 4.5 4.5 2 8 2 C11.5 2 14 4.5 14 8" /><line x1="2" y1="10" x2="14" y2="10" />
                  <line x1="5" y1="10" x2="5" y2="14" /><line x1="11" y1="10" x2="11" y2="14" /><line x1="3" y1="14" x2="13" y2="14" />
                </svg>
              ),
            },
            {
              title: 'Stablecoins',
              desc: 'USDC and USDT across Ethereum and Polygon. On-chain settlement, instant finality, borderless.',
              icon: (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1">
                  <circle cx="8" cy="8" r="6" /><line x1="8" y1="4" x2="8" y2="12" />
                  <path d="M5.5 5.5 C6 4.5 10.5 4.5 10.5 6.5 C10.5 8 8 8 8 8 C8 8 10.5 8 10.5 9.5 C10.5 11.5 6 11.5 5.5 10.5" />
                </svg>
              ),
            },
          ].map((f, i) => (
            <div key={f.title}
              className="p-10 transition-colors hover:bg-gold/5 cursor-default"
              style={{ borderRight: i < 2 ? '1px solid rgba(201,146,42,0.18)' : 'none' }}>
              <div className="w-9 h-9 flex items-center justify-center text-gold mb-8"
                style={{ border: '1px solid rgba(201,146,42,0.25)' }}>
                {f.icon}
              </div>
              <h3 className="font-serif font-normal text-lg text-rx-text mb-3">{f.title}</h3>
              <p className="text-xs leading-loose text-rx-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="max-w-4xl mx-auto px-8 py-8 flex items-center justify-between"
        style={{ borderTop: '1px solid rgba(201,146,42,0.15)' }}>
        <span className="font-serif text-sm tracking-widest text-rx-muted">
          RIVER <em className="not-italic text-gold">X</em>
        </span>
        <span className="text-[9px] tracking-[0.16em] uppercase text-rx-border">
          © 2026 River X · All rights reserved
        </span>
      </footer>

    </main>
  )
}
