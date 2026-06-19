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

  // Card fields
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
      let body: Record<string, unknown> = {
        method,
        amount: parseFloat(amount),
      }

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
      <h1 className="text-3xl font-bold text-gray-900">Send Payment</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border p-6 space-y-5">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Payment Method</label>
          <div className="grid grid-cols-2 gap-2">
            {methods.map(m => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMethod(m.value)}
                className={`p-3 rounded-xl border text-left transition ${method === m.value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="text-sm font-medium text-gray-900">{m.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Crypto fields */}
        {isCrypto && (
          <>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Recipient Email (FlowPay user)</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Or Wallet Address</label>
              <input
                type="text"
                value={recipientAddress}
                onChange={e => setRecipientAddress(e.target.value)}
                placeholder="0x..."
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </>
        )}

        {/* ACH fields */}
        {isACH && (
          <>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Recipient Email</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                placeholder="user@example.com"
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Pay from Bank Account</label>
              {bankAccounts.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-3 text-sm text-yellow-700">
                  No linked bank accounts. Go to <strong>Wallet</strong> to link a bank account via Plaid first.
                </div>
              ) : (
                <select
                  value={bankAccountId}
                  onChange={e => setBankAccountId(e.target.value)}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
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

        {/* Card fields */}
        {isCard && (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Recipient Email (FlowPay user)</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={e => setRecipientEmail(e.target.value)}
                placeholder="user@example.com"
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="border-t pt-3 space-y-3">
              <p className="text-xs text-gray-500 font-medium">Your Card Details</p>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Name on Card</label>
                <input value={cardName} onChange={e => setCardName(e.target.value)} placeholder="John Doe" required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Card Number</label>
                <input value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="4242 4242 4242 4242"
                  maxLength={19} required
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Expiry</label>
                  <input value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} placeholder="MM/YY" maxLength={5} required
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">CVC</label>
                  <input value={cardCvc} onChange={e => setCardCvc(e.target.value)} placeholder="123" maxLength={4} required
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="bg-blue-50 text-blue-700 text-xs rounded-lg px-3 py-2">
                Test card: <strong>4242 4242 4242 4242</strong> · Any future expiry · Any CVC
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Amount (USD)</label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0.01"
              required
              className="w-full border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2">{error}</div>}

        {result && (
          <div className="bg-green-50 text-green-700 text-sm rounded-lg px-3 py-3 space-y-1">
            <div className="font-medium">
              {isACH ? 'ACH transfer initiated! Arrives in 1-3 business days.' : 'Payment sent!'}
            </div>
            {result.txHash && <div className="font-mono text-xs break-all">{result.txHash}</div>}
            {result.clientSecret && <div className="text-xs">Payment intent created — awaiting confirmation.</div>}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Send size={16} />
          {loading ? 'Sending...' : 'Send Payment'}
        </button>
      </form>
    </div>
  )
}
