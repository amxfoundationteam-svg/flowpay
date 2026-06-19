'use client'
import { useEffect, useState } from 'react'
import { ArrowUpRight, Landmark, Coins } from 'lucide-react'

interface Payout {
  id: string; recipientName: string; recipientEmail: string
  amount: number; currency: string; method: string; status: string
  createdAt: string; memo?: string
}

const statusColors: Record<string, string> = {
  SENT: 'bg-green-100 text-green-700',
  PROCESSING: 'bg-yellow-100 text-yellow-700',
  PENDING: 'bg-gray-100 text-gray-600',
  FAILED: 'bg-red-100 text-red-700',
}

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

    // First create a Stripe bank token, then payout
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
      setSuccess('Payout initiated! Funds will arrive in 1-3 business days.')
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
      setSuccess('Crypto payout sent!')
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
        <h1 className="text-3xl font-bold text-gray-900">Payouts</h1>
        <p className="text-sm text-gray-500 mt-1">Send money out of FlowPay to a bank account or external wallet.</p>
      </div>

      <div className="bg-white rounded-2xl border p-6 space-y-5">
        {/* Tabs */}
        <div className="flex gap-2">
          <button onClick={() => { setTab('bank'); setError(''); setSuccess('') }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${tab === 'bank' ? 'bg-indigo-600 text-white' : 'text-gray-600 border hover:bg-gray-50'}`}>
            <Landmark size={15} /> Bank (ACH)
          </button>
          <button onClick={() => { setTab('crypto'); setError(''); setSuccess('') }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${tab === 'crypto' ? 'bg-indigo-600 text-white' : 'text-gray-600 border hover:bg-gray-50'}`}>
            <Coins size={15} /> Crypto (USDC/USDT)
          </button>
        </div>

        {/* Bank payout form */}
        {tab === 'bank' && (
          <form onSubmit={handleBankPayout} className="space-y-4">
            <div className="bg-blue-50 text-blue-700 text-xs rounded-lg px-3 py-2">
              Enter the recipient's bank details. Funds arrive in <strong>1-3 business days</strong> via ACH.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Recipient Name</label>
                <input required value={bankForm.recipientName} onChange={e => setBankForm(f => ({ ...f, recipientName: e.target.value }))}
                  placeholder="Jane Smith"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Recipient Email</label>
                <input required type="email" value={bankForm.recipientEmail} onChange={e => setBankForm(f => ({ ...f, recipientEmail: e.target.value }))}
                  placeholder="jane@example.com"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Account Holder Name (on bank account)</label>
              <input required value={bankForm.accountHolderName} onChange={e => setBankForm(f => ({ ...f, accountHolderName: e.target.value }))}
                placeholder="Jane Smith"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Routing Number</label>
                <input required value={bankForm.routingNumber} onChange={e => setBankForm(f => ({ ...f, routingNumber: e.target.value }))}
                  placeholder="9 digits" maxLength={9}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Account Number</label>
                <input required value={bankForm.accountNumber} onChange={e => setBankForm(f => ({ ...f, accountNumber: e.target.value }))}
                  placeholder="Account number"
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Account Type</label>
                <select value={bankForm.accountType} onChange={e => setBankForm(f => ({ ...f, accountType: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
                  <input required type="number" step="0.01" min="0.01" value={bankForm.amount}
                    onChange={e => setBankForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full border rounded-lg pl-7 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Memo (optional)</label>
              <input value={bankForm.memo} onChange={e => setBankForm(f => ({ ...f, memo: e.target.value }))}
                placeholder="e.g. Invoice #1042 payment"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>

            {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2">{error}</div>}
            {success && <div className="bg-green-50 text-green-700 text-sm rounded-lg px-3 py-2">{success}</div>}

            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
              <ArrowUpRight size={16} /> {loading ? 'Sending...' : 'Send Bank Payout'}
            </button>
          </form>
        )}

        {/* Crypto payout form */}
        {tab === 'crypto' && (
          <form onSubmit={handleCryptoPayout} className="space-y-4">
            <div className="bg-blue-50 text-blue-700 text-xs rounded-lg px-3 py-2">
              Send USDC or USDT directly to any external wallet address. Arrives in minutes.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Recipient Name</label>
                <input required value={cryptoForm.recipientName} onChange={e => setCryptoForm(f => ({ ...f, recipientName: e.target.value }))}
                  placeholder="Jane Smith"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Recipient Email</label>
                <input required type="email" value={cryptoForm.recipientEmail} onChange={e => setCryptoForm(f => ({ ...f, recipientEmail: e.target.value }))}
                  placeholder="jane@example.com"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Recipient Wallet Address</label>
              <input required value={cryptoForm.recipientAddress} onChange={e => setCryptoForm(f => ({ ...f, recipientAddress: e.target.value }))}
                placeholder="0x..."
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Token & Network</label>
                <select value={cryptoForm.method} onChange={e => setCryptoForm(f => ({ ...f, method: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                  <option value="USDC_POLYGON">USDC (Polygon) — recommended</option>
                  <option value="USDC_ETH">USDC (Ethereum)</option>
                  <option value="USDT_ETH">USDT (Ethereum)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
                  <input required type="number" step="0.01" min="0.01" value={cryptoForm.amount}
                    onChange={e => setCryptoForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full border rounded-lg pl-7 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Memo (optional)</label>
              <input value={cryptoForm.memo} onChange={e => setCryptoForm(f => ({ ...f, memo: e.target.value }))}
                placeholder="e.g. Freelance payment"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>

            {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2">{error}</div>}
            {success && <div className="bg-green-50 text-green-700 text-sm rounded-lg px-3 py-2">{success}</div>}

            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
              <ArrowUpRight size={16} /> {loading ? 'Sending...' : 'Send Crypto Payout'}
            </button>
          </form>
        )}
      </div>

      {/* Payout history */}
      <div className="bg-white rounded-2xl border shadow-sm">
        <div className="p-4 border-b font-semibold text-gray-900">Payout History</div>
        <div className="divide-y">
          {payouts.length === 0 && <div className="p-6 text-center text-gray-400">No payouts yet</div>}
          {payouts.map(p => (
            <div key={p.id} className="flex items-center justify-between p-4">
              <div>
                <div className="text-sm font-medium text-gray-900">{p.recipientName}</div>
                <div className="text-xs text-gray-400">{p.recipientEmail} · {p.method} · {new Date(p.createdAt).toLocaleDateString()}</div>
                {p.memo && <div className="text-xs text-gray-400 italic">{p.memo}</div>}
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[p.status]}`}>{p.status}</span>
                <span className="font-semibold text-gray-900">{p.currency} {Number(p.amount).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
