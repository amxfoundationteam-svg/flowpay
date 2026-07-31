'use client'
import { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

const INPUT = 'w-full bg-secondary border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold transition'
const BORDER = { border: '1px solid rgba(201,146,42,0.15)' }
const LABEL = 'block text-[10px] tracking-[0.14em] uppercase text-muted-foreground mb-1'

export default function ProfilePage() {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [rxUsername, setRxUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        setEmail(d.email ?? '')
        setFirstName(d.firstName ?? '')
        setLastName(d.lastName ?? '')
        setRxUsername(d.rxUsername ?? '')
      })
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setStatus(null)

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, rxUsername: rxUsername || null }),
    })
    const data = await res.json()

    if (res.ok) {
      setStatus({ type: 'success', message: 'Profile saved.' })
      if (data.rxUsername) setRxUsername(data.rxUsername)
    } else {
      setStatus({ type: 'error', message: data.error ?? 'Failed to save profile.' })
    }
    setSaving(false)
  }

  const rxValid = !rxUsername || /^[a-zA-Z0-9_]{3,20}$/.test(rxUsername)

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-serif font-normal text-2xl tracking-wide text-foreground">Profile</h1>

      <form onSubmit={handleSave} className="space-y-4">

        {/* Identity */}
        <div className="bg-card p-6 space-y-4" style={BORDER}>
          <h2 className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">Identity</h2>

          <div>
            <label className={LABEL}>Email</label>
            <div className="w-full bg-secondary border border-border px-3 py-2 text-sm text-muted-foreground select-none"
              style={{ border: '1px solid rgba(201,146,42,0.1)' }}>
              {email || '—'}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Managed by your sign-in provider.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>First Name</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)}
                placeholder="Jane" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Last Name</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)}
                placeholder="Smith" className={INPUT} />
            </div>
          </div>
        </div>

        {/* RX Identity */}
        <div className="bg-card p-6 space-y-4" style={BORDER}>
          <div>
            <h2 className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">RX Identity</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Your unique River X handle. Share it with anyone to receive instant crypto payments — no wallet address needed.
            </p>
          </div>

          <div>
            <label className={LABEL}>RX Username</label>
            <div className="flex items-stretch">
              <div className="flex items-center px-3 text-sm text-gold font-mono bg-secondary select-none"
                style={{ border: '1px solid rgba(201,146,42,0.3)', borderRight: 'none' }}>
                RX$
              </div>
              <input
                value={rxUsername}
                onChange={e => setRxUsername(e.target.value.replace(/\s/g, ''))}
                placeholder="yourname"
                maxLength={20}
                spellCheck={false}
                autoComplete="off"
                className={`${INPUT} font-mono flex-1`}
                style={{ borderLeft: 'none' }}
              />
            </div>
            {rxUsername && !rxValid && (
              <p className="text-[10px] text-red-400 mt-1">3–20 characters: letters, numbers, and underscores only.</p>
            )}
            {rxUsername && rxValid && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Others can send you funds by entering <span className="text-gold font-mono">RX${rxUsername}</span>.
              </p>
            )}
          </div>
        </div>

        {status && (
          <div className={`flex items-center gap-2 px-3 py-2.5 text-xs ${
            status.type === 'success'
              ? 'text-gold bg-gold/5'
              : 'text-red-400 bg-red-500/5'
          }`} style={{ border: status.type === 'success' ? '1px solid rgba(201,146,42,0.2)' : '1px solid rgba(239,68,68,0.2)' }}>
            {status.type === 'success'
              ? <CheckCircle size={13} />
              : <AlertCircle size={13} />}
            {status.message}
          </div>
        )}

        <button type="submit" disabled={saving || !rxValid}
          className="w-full bg-gold text-rx-bg py-3 text-[11px] tracking-[0.18em] uppercase font-semibold hover:bg-gold-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <><Loader2 size={14} className="animate-spin" />Saving...</> : 'Save Profile'}
        </button>
      </form>
    </div>
  )
}
