'use client'
import { useEffect, useState } from 'react'
import { Send } from 'lucide-react'

type Method = 'USDC_POLYGON' | 'USDC_ETH' | 'USDT_ETH' | 'CARD' | 'ACH'

const methods: { value: Method; label: string; desc: string }[] = [
  { value: 'USDC_POLYGON', label: 'USDC (Polygon)', desc: 'Fast & cheap — recommended' },
  { value: 'USDC_ETH', label: 'USDC (Ethereum)', desc: 'Higher gas fees' },
  { value: 'USDT_ETH', label: 'USDT (Ethereum)', desc: 'Tether on Ethereum' },
  { value: 'CARD', label: 'Card', desc: 'Stripe card payment' },
  { value: 'ACH', label: 'ACH / Bank', desc: 'Direct bank transfer' },
]

const INPUT = 'w-full bg-secondary border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold transition'

interface BankAccount {
  id: string
  institutionName: string
  accountMask: string
  accountType: string
}

export default function SendPage() {
  const [method, setMethod] = useState<Method>('USDC_POLYGON')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientAddress, setRecipientAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [bankAccountId, setBankAccountId] = useState('')
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ status: string; txHash?: string; clientSecret?: string } | null>(null)
  const [error, setError] = useState('')

  const [cardName, setCardName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvc, setCardCvc] = useState('')

  const isCrypto = method.startsWith('USDC') || method.startsWith('USDT')
  const isACH = method === 'ACH'
  const isCard = method === 'CARD'

  useEffect(() => {
    if (isACH) {
      fetch('/api/bank/accounts').then(r => r.json()).then(d => setBankAccounts(d.accounts ?? []))
    }
  }, [isACH])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    try {
      let endpoint = '/api/wallet/send'
      let body: Record<string, unknown> = { method, amount: parseFloat(amount) }

      if (isCrypto) {
        if (recipientEmail) body.recipientEmail = recipientEmail
        if (recipientAddress) body.recipientAddress = recipientAddress
      }
      if (isACH) {
        endpoint = '/api/payments/ach/initiate'
        body = { amount: parseFloat(amount), bankAccountId, recipientEmail }
      }
      if (isCard) {
        endpoint = '/api/payments/card/intent'
        body = { amount: parseFloat(amount), receiverId: recipientEmail, cardName, cardNumber, cardExpiry, cardCvc }
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error?.message ?? JSON.stringify(data.error) ?? 'Payment failed'); return }
      setResult(data)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-serif font-normal text-2xl tracking-wide text-foreground">Send Payment</h1>

      <form onSubmit={handleSubmit} className="bg-card space-y-5 p-6" style={{ border: '1px solid rgba(201,146,42,0.15)' }}>

        <div>
          <label className="block text-[10px] tracking-[0.18em] uppercase text-muted-foreground mb-2">Payment Method</label>
          <div className="grid grid-cols-2 gap-2">
            {methods.map(m => (
              <button key={m.value} type="button" onClick={() => setMethod(m.value)}
                className={`p-3 text-left transition-colors ${
                  method === m.value
                    ? 'bg-gold/8 text-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
                style={{ border: method === m.value ? '1px solid rgba(201,146,42,0.5)' : '1px solid rgba(201,146,42,0.12)' }}>
                <div className="text-xs font-medium">{m.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {isCrypto && (
          <>
            <div>
              <label className="block text-[10px] tracking-[0.14em] uppercase text-muted-foreground mb-1">
                Recipient Email (River X user)
              </label>
              <input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)}
                placeholder="user@example.com" className={INPUT} />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.14em] uppercase text-muted-foreground mb-1">Or Wallet Address</label>
              <input type="text" value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)}
                placeholder="0x..." className={`${INPUT} font-mono`} />
            </div>
          </>
        )}

        {isACH && (
          <>
            <div>
              <label className="block text-[10px] tracking-[0.14em] uppercase text-muted-foreground mb-1">Recipient Email</label>
              <input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)}
                placeholder="user@example.com" required className={INPUT} />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.14em] uppercase text-muted-foreground mb-1">Pay from Bank Account</label>
              {bankAccounts.length === 0 ? (
                <div className="text-xs text-muted-foreground px-3 py-3 bg-secondary" style={{ border: '1px solid rgba(201,146,42,0.15)' }}>
                  No linked bank accounts. Go to <strong className="text-foreground">Wallet</strong> to link one first.
                </div>
              ) : (
                <select value={bankAccountId} onChange={e => setBankAccountId(e.target.value)} required className={INPUT}>
                  <option value="">Select account...</option>
                  {bankAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.institutionName} ····{acc.accountMask} ({acc.accountType})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </>
        )}

        {isCard && (
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] tracking-[0.14em] uppercase text-muted-foreground mb-1">
                Recipient Email (River X user)
              </label>
              <input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)}
                placeholder="user@example.com" required className={INPUT} />
            </div>
            <div className="pt-3 space-y-3" style={{ borderTop: '1px solid rgba(201,146,42,0.12)' }}>
              <p className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground">Your Card Details</p>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Name on Card</label>
                <input value={cardName} onChange={e => setCardName(e.target.value)} placeholder="John Doe" required className={INPUT} />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Card Number</label>
                <input value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="4242 4242 4242 4242"
                  maxLength={19} required className={`${INPUT} font-mono`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-1">Expiry</label>
                  <input value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} placeholder="MM/YY" maxLength={5} required
                    className={`${INPUT} font-mono`} />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-1">CVC</label>
                  <input value={cardCvc} onChange={e => setCardCvc(e.target.value)} placeholder="123" maxLength={4} required
                    className={`${INPUT} font-mono`} />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground px-3 py-2 bg-secondary" style={{ border: '1px solid rgba(201,146,42,0.12)' }}>
                Card details are processed securely via Stripe. River X never stores your card number.
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-[10px] tracking-[0.14em] uppercase text-muted-foreground mb-1">Amount (USD)</label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00" step="0.01" min="0.01" required
              className={`${INPUT} pl-7`} />
          </div>
        </div>

        {error && (
          <div className="text-xs text-red-400 px-3 py-2 bg-red-500/8" style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        {result && (
          <div className="text-xs text-gold px-3 py-3 space-y-1 bg-gold/5" style={{ border: '1px solid rgba(201,146,42,0.2)' }}>
            <div className="font-medium">
              {isACH ? 'ACH transfer initiated — arrives in 1–3 business days.' : 'Payment sent successfully.'}
            </div>
            {result.txHash && <div className="font-mono text-muted-foreground break-all">{result.txHash}</div>}
            {result.clientSecret && <div className="text-muted-foreground">Payment intent created — awaiting confirmation.</div>}
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full bg-gold text-rx-bg py-3 text-[11px] tracking-[0.18em] uppercase font-semibold hover:bg-gold-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          <Send size={14} />
          {loading ? 'Sending...' : 'Send Payment'}
        </button>
      </form>
    </div>
  )
}
