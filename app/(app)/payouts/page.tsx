'use client'
import { useEffect, useState } from 'react'
import { ArrowUpRight, Landmark, Coins } from 'lucide-react'

interface Payout {
  id: string; recipientName: string; recipientEmail: string
  amount: number; currency: string; method: string; status: string
  createdAt: string; memo?: string
}

const statusBadge: Record<string, string> = {
  SENT: 'text-gold border-gold/30 bg-gold/8',
  PROCESSING: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/8',
  PENDING: 'text-muted-foreground border-border bg-secondary',
  FAILED: 'text-red-400 border-red-500/30 bg-red-500/8',
}

const INPUT = 'w-full bg-secondary border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold transition'
const BORDER = { border: '1px solid rgba(201,146,42,0.15)' }

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [tab, setTab] = useState<'bank' | 'crypto'>('bank')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const [bankForm, setBankForm] = useState({
    recipientName: '', recipientEmail: '', accountHolderName: '',
    routingNumber: '', accountNumber: '', accountType: 'checking',
    amount: '', memo: '',
  })

  const [cryptoForm, setCryptoForm] = useState({
    recipientName: '', recipientEmail: '', recipientAddress: '',
    method: 'USDC_POLYGON', amount: '', memo: '',
  })

  useEffect(() => {
    fetch('/api/payouts').then(r => r.json()).then(d => setPayouts(d.payouts ?? []))
  }, [])

  const handleBankPayout = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess('')
    const res = await fetch('/api/payouts/bank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientName: bankForm.recipientName,
        recipientEmail: bankForm.recipientEmail,
        accountHolderName: bankForm.accountHolderName,
        routingNumber: bankForm.routingNumber,
        accountNumber: bankForm.accountNumber,
        accountType: bankForm.accountType,
        amount: parseFloat(bankForm.amount),
        memo: bankForm.memo,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setSuccess('Payout initiated — funds arrive in 1–3 business days.')
      setBankForm({ recipientName: '', recipientEmail: '', accountHolderName: '', routingNumber: '', accountNumber: '', accountType: 'checking', amount: '', memo: '' })
      fetch('/api/payouts').then(r => r.json()).then(d => setPayouts(d.payouts ?? []))
    } else {
      setError(data.error ?? 'Payout failed')
    }
    setLoading(false)
  }

  const handleCryptoPayout = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess('')
    const res = await fetch('/api/payouts/crypto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cryptoForm, amount: parseFloat(cryptoForm.amount) }),
    })
    const data = await res.json()
    if (res.ok) {
      setSuccess('Crypto payout sent.')
      setCryptoForm({ recipientName: '', recipientEmail: '', recipientAddress: '', method: 'USDC_POLYGON', amount: '', memo: '' })
      fetch('/api/payouts').then(r => r.json()).then(d => setPayouts(d.payouts ?? []))
    } else {
      setError(data.error ?? 'Payout failed')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-serif font-normal text-2xl tracking-wide text-foreground">Payouts</h1>
        <p className="text-xs text-muted-foreground mt-1">Send money out of River X to a bank account or external wallet.</p>
      </div>

      <div className="bg-card p-6 space-y-5" style={BORDER}>
        <div className="flex gap-2">
          {[
            { key: 'bank', label: 'Bank (ACH)', icon: Landmark },
            { key: 'crypto', label: 'Crypto', icon: Coins },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => { setTab(key as any); setError(''); setSuccess('') }}
              className={`flex items-center gap-2 px-4 py-2 text-[10px] tracking-[0.14em] uppercase font-medium transition-colors ${
                tab === key
                  ? 'bg-gold text-rx-bg font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              style={tab !== key ? { border: '1px solid rgba(201,146,42,0.2)' } : {}}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {tab === 'bank' && (
          <form onSubmit={handleBankPayout} className="space-y-4">
            <div className="text-xs text-muted-foreground px-3 py-2" style={{ border: '1px solid rgba(201,146,42,0.12)', background: 'rgba(201,146,42,0.04)' }}>
              Enter the recipient's bank details. Funds arrive in <strong className="text-foreground">1–3 business days</strong> via ACH.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Recipient Name</label>
                <input required value={bankForm.recipientName} onChange={e => setBankForm(f => ({ ...f, recipientName: e.target.value }))} placeholder="Jane Smith" className={INPUT} />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Recipient Email</label>
                <input required type="email" value={bankForm.recipientEmail} onChange={e => setBankForm(f => ({ ...f, recipientEmail: e.target.value }))} placeholder="jane@example.com" className={INPUT} />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Account Holder Name (on bank account)</label>
              <input required value={bankForm.accountHolderName} onChange={e => setBankForm(f => ({ ...f, accountHolderName: e.target.value }))} placeholder="Jane Smith" className={INPUT} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Routing Number</label>
                <input required value={bankForm.routingNumber} onChange={e => setBankForm(f => ({ ...f, routingNumber: e.target.value }))} placeholder="9 digits" maxLength={9} className={`${INPUT} font-mono`} />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Account Number</label>
                <input required value={bankForm.accountNumber} onChange={e => setBankForm(f => ({ ...f, accountNumber: e.target.value }))} placeholder="Account number" className={`${INPUT} font-mono`} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Account Type</label>
                <select value={bankForm.accountType} onChange={e => setBankForm(f => ({ ...f, accountType: e.target.value }))} className={INPUT}>
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
                  <input required type="number" step="0.01" min="0.01" value={bankForm.amount}
                    onChange={e => setBankForm(f => ({ ...f, amount: e.target.value }))} className={`${INPUT} pl-7`} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Memo (optional)</label>
              <input value={bankForm.memo} onChange={e => setBankForm(f => ({ ...f, memo: e.target.value }))} placeholder="e.g. Invoice #1042" className={INPUT} />
            </div>

            {error && <div className="text-xs text-red-400 px-3 py-2" style={{ border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}
            {success && <div className="text-xs text-gold px-3 py-2" style={{ border: '1px solid rgba(201,146,42,0.2)' }}>{success}</div>}

            <button type="submit" disabled={loading}
              className="w-full bg-gold text-rx-bg py-2.5 text-[11px] tracking-[0.16em] uppercase font-semibold hover:bg-gold-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              <ArrowUpRight size={14} /> {loading ? 'Sending...' : 'Send Bank Payout'}
            </button>
          </form>
        )}

        {tab === 'crypto' && (
          <form onSubmit={handleCryptoPayout} className="space-y-4">
            <div className="text-xs text-muted-foreground px-3 py-2" style={{ border: '1px solid rgba(201,146,42,0.12)', background: 'rgba(201,146,42,0.04)' }}>
              Send USDC or USDT directly to any external wallet. Arrives in minutes.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Recipient Name</label>
                <input required value={cryptoForm.recipientName} onChange={e => setCryptoForm(f => ({ ...f, recipientName: e.target.value }))} placeholder="Jane Smith" className={INPUT} />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Recipient Email</label>
                <input required type="email" value={cryptoForm.recipientEmail} onChange={e => setCryptoForm(f => ({ ...f, recipientEmail: e.target.value }))} placeholder="jane@example.com" className={INPUT} />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Recipient Wallet Address</label>
              <input required value={cryptoForm.recipientAddress} onChange={e => setCryptoForm(f => ({ ...f, recipientAddress: e.target.value }))} placeholder="0x..." className={`${INPUT} font-mono`} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Token & Network</label>
                <select value={cryptoForm.method} onChange={e => setCryptoForm(f => ({ ...f, method: e.target.value }))} className={INPUT}>
                  <option value="USDC_POLYGON">USDC (Polygon) — recommended</option>
                  <option value="USDC_ETH">USDC (Ethereum)</option>
                  <option value="USDT_ETH">USDT (Ethereum)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
                  <input required type="number" step="0.01" min="0.01" value={cryptoForm.amount}
                    onChange={e => setCryptoForm(f => ({ ...f, amount: e.target.value }))} className={`${INPUT} pl-7`} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Memo (optional)</label>
              <input value={cryptoForm.memo} onChange={e => setCryptoForm(f => ({ ...f, memo: e.target.value }))} placeholder="e.g. Freelance payment" className={INPUT} />
            </div>

            {error && <div className="text-xs text-red-400 px-3 py-2" style={{ border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}
            {success && <div className="text-xs text-gold px-3 py-2" style={{ border: '1px solid rgba(201,146,42,0.2)' }}>{success}</div>}

            <button type="submit" disabled={loading}
              className="w-full bg-gold text-rx-bg py-2.5 text-[11px] tracking-[0.16em] uppercase font-semibold hover:bg-gold-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              <ArrowUpRight size={14} /> {loading ? 'Sending...' : 'Send Crypto Payout'}
            </button>
          </form>
        )}
      </div>

      {/* Payout history */}
      <div className="bg-card" style={BORDER}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(201,146,42,0.12)' }}>
          <span className="text-[9px] tracking-[0.28em] uppercase text-gold">Payout History</span>
        </div>
        {payouts.length === 0 && (
          <div className="p-8 text-center text-[10px] tracking-[0.18em] uppercase text-muted-foreground">No payouts yet</div>
        )}
        {payouts.map((p, i) => (
          <div key={p.id} className="flex items-center justify-between px-5 py-4"
            style={{ borderTop: i > 0 ? '1px solid rgba(201,146,42,0.08)' : 'none' }}>
            <div>
              <div className="text-sm text-foreground">{p.recipientName}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {p.recipientEmail} · {p.method} · {new Date(p.createdAt).toLocaleDateString()}
              </div>
              {p.memo && <div className="text-[10px] text-muted-foreground/60 italic">{p.memo}</div>}
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 border ${statusBadge[p.status]}`}>
                {p.status}
              </span>
              <span className="text-sm font-medium text-foreground tabular-nums">
                {p.currency} {Number(p.amount).toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
