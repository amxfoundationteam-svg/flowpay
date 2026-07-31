'use client'
import { useEffect, useState, use } from 'react'
import { CreditCard, Landmark, Coins } from 'lucide-react'

interface LineItem { id: string; description: string; quantity: number; unitPrice: number; total: number }
interface Invoice {
  id: string; number: string; clientName: string; clientEmail: string
  total: number; currency: string; status: string; dueDate: string
  lineItems: LineItem[]; issuer: { name: string | null; email: string }
  paymentMethods: string[]
}

const METHOD_LABELS: Record<string, { label: string; icon: React.ReactNode; desc: string }> = {
  CARD:         { label: 'Credit / Debit Card',    icon: <CreditCard size={16} />,  desc: 'Visa, Mastercard, Amex' },
  ACH:          { label: 'Bank Transfer (ACH)',     icon: <Landmark size={16} />,    desc: 'US bank · 1-3 business days' },
  USDC_POLYGON: { label: 'USDC on Polygon',         icon: <Coins size={16} />,       desc: 'Fast & low fee stablecoin' },
  USDC_ETH:     { label: 'USDC on Ethereum',        icon: <Coins size={16} />,       desc: 'USDC on Ethereum' },
  USDT_ETH:     { label: 'USDT on Ethereum',        icon: <Coins size={16} />,       desc: 'Tether on Ethereum' },
}

const INPUT = 'w-full bg-secondary border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold transition'
const BORDER = { border: '1px solid rgba(201,146,42,0.15)' }

export default function PayInvoicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<string>('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [paid, setPaid] = useState(false)
  const [error, setError] = useState('')

  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvc, setCardCvc] = useState('')
  const [cardName, setCardName] = useState('')

  const [routingNumber, setRoutingNumber] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolderName, setAccountHolderName] = useState('')
  const [accountType, setAccountType] = useState('checking')

  const [walletAddress, setWalletAddress] = useState('')
  const [txHash, setTxHash] = useState('')

  useEffect(() => {
    fetch(`/api/pay/${slug}`).then(r => r.json()).then(d => {
      setInvoice(d.invoice)
      if (d.invoice?.paymentMethods?.length) setSelectedMethod(d.invoice.paymentMethods[0])
    })
  }, [slug])

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch(`/api/pay/${slug}/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        method: selectedMethod,
        ...(selectedMethod === 'CARD' ? { cardNumber, cardExpiry, cardCvc, cardName } : {}),
        ...(selectedMethod === 'ACH' ? { routingNumber, accountNumber, accountHolderName, accountType } : {}),
        ...((selectedMethod.startsWith('USDC') || selectedMethod.startsWith('USDT')) ? { walletAddress, txHash } : {}),
      }),
    })

    const data = await res.json()
    if (res.ok) { setPaid(true) }
    else { setError(data.error ?? 'Payment failed') }
    setLoading(false)
  }

  if (!invoice) return (
    <div className="min-h-screen flex items-center justify-center bg-rx-bg">
      <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Loading...</span>
    </div>
  )

  if (paid) return (
    <div className="min-h-screen flex items-center justify-center bg-rx-bg">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-12 h-12 mx-auto flex items-center justify-center text-gold" style={BORDER}>
          <span className="text-xl">✓</span>
        </div>
        <h1 className="font-serif font-normal text-2xl text-foreground">Payment Successful</h1>
        <p className="text-xs text-muted-foreground">Invoice {invoice.number} has been paid. A receipt will be sent to {email}.</p>
      </div>
    </div>
  )

  if (invoice.status === 'PAID') return (
    <div className="min-h-screen flex items-center justify-center bg-rx-bg">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-12 h-12 mx-auto flex items-center justify-center text-gold" style={BORDER}>
          <span className="text-xl">✓</span>
        </div>
        <h1 className="font-serif font-normal text-2xl text-foreground">Already Paid</h1>
        <p className="text-xs text-muted-foreground">This invoice has already been paid. Thank you.</p>
      </div>
    </div>
  )

  const isCrypto = selectedMethod.startsWith('USDC') || selectedMethod.startsWith('USDT')

  return (
    <div className="min-h-screen bg-rx-bg py-12 px-4">
      <div className="max-w-lg mx-auto space-y-4">

        {/* Branding */}
        <div className="text-center py-4">
          <span className="font-serif text-xl tracking-widest text-foreground">
            RIVER <em className="not-italic text-gold">X</em>
          </span>
        </div>

        {/* Invoice summary */}
        <div className="bg-card p-6 space-y-4" style={BORDER}>
          <div>
            <h1 className="font-serif font-normal text-lg text-foreground">Invoice {invoice.number}</h1>
            <p className="text-[10px] tracking-[0.1em] text-muted-foreground mt-0.5">
              From {invoice.issuer.name ?? invoice.issuer.email} · Due {new Date(invoice.dueDate).toLocaleDateString()}
            </p>
          </div>

          <div className="overflow-hidden" style={BORDER}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(201,146,42,0.12)' }}>
                  <th className="text-left px-4 py-2.5 text-[10px] tracking-[0.12em] uppercase text-muted-foreground font-normal">Description</th>
                  <th className="text-right px-4 py-2.5 text-[10px] tracking-[0.12em] uppercase text-muted-foreground font-normal">Qty</th>
                  <th className="text-right px-4 py-2.5 text-[10px] tracking-[0.12em] uppercase text-muted-foreground font-normal">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((li, i) => (
                  <tr key={li.id} style={{ borderTop: i > 0 ? '1px solid rgba(201,146,42,0.08)' : 'none' }}>
                    <td className="px-4 py-3 text-foreground">{li.description}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">{li.quantity}</td>
                    <td className="px-4 py-3 text-right text-foreground tabular-nums">${Number(li.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '1px solid rgba(201,146,42,0.2)', background: 'rgba(201,146,42,0.05)' }}>
                  <td colSpan={2} className="px-4 py-3 text-[10px] tracking-[0.12em] uppercase text-muted-foreground">Total Due</td>
                  <td className="px-4 py-3 text-right font-serif text-lg text-gold tabular-nums">
                    {invoice.currency} {Number(invoice.total).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Payment form */}
        <div className="bg-card p-6 space-y-5" style={BORDER}>
          <h2 className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground">Payment Details</h2>

          <div>
            <label className="block text-[10px] text-muted-foreground mb-1">Your Email</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" className={INPUT} />
          </div>

          {invoice.paymentMethods.length > 1 && (
            <div>
              <label className="block text-[10px] tracking-[0.12em] uppercase text-muted-foreground mb-2">Payment Method</label>
              <div className="space-y-2">
                {invoice.paymentMethods.map(m => {
                  const info = METHOD_LABELS[m]
                  if (!info) return null
                  const active = selectedMethod === m
                  return (
                    <button key={m} type="button" onClick={() => setSelectedMethod(m)}
                      className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                        active ? 'text-gold bg-gold/8' : 'text-muted-foreground bg-secondary hover:text-foreground'
                      }`}
                      style={{ border: active ? '1px solid rgba(201,146,42,0.45)' : '1px solid rgba(201,146,42,0.12)' }}>
                      <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 ${active ? 'text-gold' : 'text-muted-foreground'}`}
                        style={{ border: '1px solid rgba(201,146,42,0.2)' }}>
                        {info.icon}
                      </div>
                      <div>
                        <div className="text-xs font-medium">{info.label}</div>
                        <div className="text-[10px] text-muted-foreground">{info.desc}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {selectedMethod === 'CARD' && (
            <div className="space-y-3 pt-4" style={{ borderTop: '1px solid rgba(201,146,42,0.12)' }}>
              <p className="text-[10px] text-muted-foreground">Payments processed securely by Stripe.</p>
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
            </div>
          )}

          {selectedMethod === 'ACH' && (
            <div className="space-y-3 pt-4" style={{ borderTop: '1px solid rgba(201,146,42,0.12)' }}>
              <p className="text-[10px] text-muted-foreground">ACH transfers take 1-3 business days.</p>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Account Holder Name</label>
                <input value={accountHolderName} onChange={e => setAccountHolderName(e.target.value)} placeholder="John Doe" required className={INPUT} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-1">Routing Number</label>
                  <input value={routingNumber} onChange={e => setRoutingNumber(e.target.value)} placeholder="9 digits" maxLength={9} required
                    className={`${INPUT} font-mono`} />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-1">Account Number</label>
                  <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Account number" required
                    className={`${INPUT} font-mono`} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Account Type</label>
                <select value={accountType} onChange={e => setAccountType(e.target.value)} className={INPUT}>
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                </select>
              </div>
            </div>
          )}

          {isCrypto && (
            <div className="space-y-3 pt-4" style={{ borderTop: '1px solid rgba(201,146,42,0.12)' }}>
              <p className="text-[10px] text-muted-foreground">
                Send <strong className="text-foreground">{Number(invoice.total).toFixed(2)} {selectedMethod === 'USDT_ETH' ? 'USDT' : 'USDC'}</strong> to the address below, then paste your transaction hash.
              </p>
              <div className="bg-secondary px-4 py-3 space-y-1" style={{ border: '1px solid rgba(201,146,42,0.12)' }}>
                <div className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground">Send to this address</div>
                <code className="text-xs text-foreground break-all block font-mono">{invoice.issuer.email}</code>
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Your Wallet Address (sender)</label>
                <input value={walletAddress} onChange={e => setWalletAddress(e.target.value)} placeholder="0x..." required
                  className={`${INPUT} font-mono`} />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Transaction Hash (after sending)</label>
                <input value={txHash} onChange={e => setTxHash(e.target.value)} placeholder="0x..." required
                  className={`${INPUT} font-mono`} />
              </div>
            </div>
          )}

          {error && (
            <div className="text-xs text-red-400 px-3 py-2" style={{ border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>
          )}

          <form onSubmit={handlePay}>
            <button type="submit" disabled={loading || !selectedMethod || !email}
              className="w-full bg-gold text-rx-bg py-3 text-[11px] tracking-[0.18em] uppercase font-semibold hover:bg-gold-light transition-colors disabled:opacity-50">
              {loading ? 'Processing...' : `Pay ${invoice.currency} ${Number(invoice.total).toFixed(2)}`}
            </button>
          </form>

          <p className="text-[10px] text-center tracking-[0.1em] uppercase text-muted-foreground/60">
            Secured by River X · Powered by Stripe
          </p>
        </div>

      </div>
    </div>
  )
}
