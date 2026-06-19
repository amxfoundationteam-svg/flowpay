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
  CARD:         { label: 'Credit / Debit Card',    icon: <CreditCard size={18} />,  desc: 'Visa, Mastercard, Amex' },
  ACH:          { label: 'Bank Transfer (ACH)',     icon: <Landmark size={18} />,    desc: 'US bank account · 1-3 business days' },
  USDC_POLYGON: { label: 'USDC on Polygon',         icon: <Coins size={18} />,       desc: 'Fast & low fee stablecoin' },
  USDC_ETH:     { label: 'USDC on Ethereum',        icon: <Coins size={18} />,       desc: 'USDC stablecoin on Ethereum' },
  USDT_ETH:     { label: 'USDT on Ethereum',        icon: <Coins size={18} />,       desc: 'Tether stablecoin on Ethereum' },
}

export default function PayInvoicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<string>('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [paid, setPaid] = useState(false)
  const [error, setError] = useState('')

  // Card fields
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvc, setCardCvc] = useState('')
  const [cardName, setCardName] = useState('')

  // ACH fields
  const [routingNumber, setRoutingNumber] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolderName, setAccountHolderName] = useState('')
  const [accountType, setAccountType] = useState('checking')

  // Crypto fields
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
        // Card details (in production these go to Stripe Elements — here for demo)
        ...(selectedMethod === 'CARD' ? { cardNumber, cardExpiry, cardCvc, cardName } : {}),
        // ACH details
        ...(selectedMethod === 'ACH' ? { routingNumber, accountNumber, accountHolderName, accountType } : {}),
        // Crypto
        ...(selectedMethod.startsWith('USDC') || selectedMethod.startsWith('USDT') ? { walletAddress, txHash } : {}),
      }),
    })

    const data = await res.json()
    if (res.ok) { setPaid(true) }
    else { setError(data.error ?? 'Payment failed') }
    setLoading(false)
  }

  if (!invoice) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>

  if (paid) return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="text-center space-y-4">
        <div className="text-6xl">✅</div>
        <h1 className="text-2xl font-bold text-green-800">Payment Successful!</h1>
        <p className="text-green-600">Invoice {invoice.number} has been paid. A receipt will be sent to {email}.</p>
      </div>
    </div>
  )

  if (invoice.status === 'PAID') return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="text-center space-y-4">
        <div className="text-6xl">✅</div>
        <h1 className="text-2xl font-bold text-green-800">Already Paid</h1>
        <p className="text-green-600">This invoice has already been paid. Thank you!</p>
      </div>
    </div>
  )

  const isCrypto = selectedMethod.startsWith('USDC') || selectedMethod.startsWith('USDT')

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Header */}
        <div className="text-center">
          <span className="text-2xl font-bold">Flow<span className="text-indigo-600">Pay</span></span>
        </div>

        {/* Invoice summary */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Invoice {invoice.number}</h1>
            <p className="text-sm text-gray-500">From {invoice.issuer.name ?? invoice.issuer.email} · Due {new Date(invoice.dueDate).toLocaleDateString()}</p>
          </div>

          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Description</th>
                  <th className="text-right px-4 py-2 text-gray-500 font-medium">Qty</th>
                  <th className="text-right px-4 py-2 text-gray-500 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoice.lineItems.map(li => (
                  <tr key={li.id}>
                    <td className="px-4 py-3 text-gray-700">{li.description}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{li.quantity}</td>
                    <td className="px-4 py-3 text-right font-medium">${Number(li.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-indigo-50">
                <tr>
                  <td colSpan={2} className="px-4 py-3 font-semibold text-gray-900">Total Due</td>
                  <td className="px-4 py-3 text-right font-bold text-indigo-700 text-lg">
                    {invoice.currency} {Number(invoice.total).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Payment form */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-5">
          <h2 className="font-semibold text-gray-900">Payment Details</h2>

          {/* Email */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Your Email</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          </div>

          {/* Payment method selector */}
          {invoice.paymentMethods.length > 1 && (
            <div>
              <label className="text-xs text-gray-500 mb-2 block">How would you like to pay?</label>
              <div className="space-y-2">
                {invoice.paymentMethods.map(m => {
                  const info = METHOD_LABELS[m]
                  if (!info) return null
                  return (
                    <button key={m} type="button" onClick={() => setSelectedMethod(m)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition ${selectedMethod === m ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedMethod === m ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                        {info.icon}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{info.label}</div>
                        <div className="text-xs text-gray-400">{info.desc}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Card fields */}
          {selectedMethod === 'CARD' && (
            <div className="space-y-3 border-t pt-4">
              <p className="text-xs text-gray-500">Enter your card details below. Payments are processed securely by Stripe.</p>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Name on Card</label>
                <input value={cardName} onChange={e => setCardName(e.target.value)} placeholder="John Doe" required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Card Number</label>
                <input value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="4242 4242 4242 4242"
                  maxLength={19} required
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Expiry</label>
                  <input value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} placeholder="MM/YY" maxLength={5} required
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">CVC</label>
                  <input value={cardCvc} onChange={e => setCardCvc(e.target.value)} placeholder="123" maxLength={4} required
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
              </div>
              <div className="bg-blue-50 text-blue-700 text-xs rounded-lg px-3 py-2">
                Test card: <strong>4242 4242 4242 4242</strong> · Any future expiry · Any CVC
              </div>
            </div>
          )}

          {/* ACH fields */}
          {selectedMethod === 'ACH' && (
            <div className="space-y-3 border-t pt-4">
              <p className="text-xs text-gray-500">Enter your US bank account details. ACH transfers take 1-3 business days.</p>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Account Holder Name</label>
                <input value={accountHolderName} onChange={e => setAccountHolderName(e.target.value)} placeholder="John Doe" required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Routing Number</label>
                  <input value={routingNumber} onChange={e => setRoutingNumber(e.target.value)} placeholder="9 digits" maxLength={9} required
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Account Number</label>
                  <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Account number" required
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Account Type</label>
                <select value={accountType} onChange={e => setAccountType(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                </select>
              </div>
            </div>
          )}

          {/* Crypto fields */}
          {isCrypto && (
            <div className="space-y-3 border-t pt-4">
              <p className="text-xs text-gray-500">
                Send <strong>{Number(invoice.total).toFixed(2)} {selectedMethod === 'USDT_ETH' ? 'USDT' : 'USDC'}</strong> to the address below, then paste your transaction hash to confirm.
              </p>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="text-xs text-gray-500">Send to this address:</div>
                <code className="text-xs text-gray-800 break-all block">
                  {invoice.issuer.email} {/* In production show the issuer's wallet address */}
                </code>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Your Wallet Address (sender)</label>
                <input value={walletAddress} onChange={e => setWalletAddress(e.target.value)} placeholder="0x..." required
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Transaction Hash (after sending)</label>
                <input value={txHash} onChange={e => setTxHash(e.target.value)} placeholder="0x..." required
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
            </div>
          )}

          {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2">{error}</div>}

          <form onSubmit={handlePay}>
            <button type="submit" disabled={loading || !selectedMethod || !email}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50 text-base">
              {loading ? 'Processing...' : `Pay ${invoice.currency} ${Number(invoice.total).toFixed(2)}`}
            </button>
          </form>

          <p className="text-xs text-center text-gray-400">
            Secured by FlowPay · Powered by Stripe
          </p>
        </div>

      </div>
    </div>
  )
}
