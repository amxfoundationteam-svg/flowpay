'use client'
import { useEffect, useState } from 'react'
import { Copy, CheckCircle, Plus, Landmark, CreditCard, RefreshCw, AlertTriangle } from 'lucide-react'

interface Addresses { ethereum: string; polygon: string }
interface Balance { usdc: { polygon: string; ethereum: string }; usdt: { ethereum: string } }
interface BankAccount { id: string; institutionName: string; accountMask: string; accountType: string; verified: boolean }

type AddMethod = 'plaid' | 'manual' | null

export default function WalletPage() {
  const [addresses, setAddresses] = useState<Addresses | null>(null)
  const [balance, setBalance] = useState<Balance | null>(null)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [tab, setTab] = useState<'crypto' | 'bank' | 'card'>('crypto')
  const [regenerating, setRegenerating] = useState(false)
  const [showRegenConfirm, setShowRegenConfirm] = useState(false)
  const [addMethod, setAddMethod] = useState<AddMethod>(null)
  const [linkingBank, setLinkingBank] = useState(false)
  const [manualLoading, setManualLoading] = useState(false)
  const [manualSuccess, setManualSuccess] = useState('')
  const [manualError, setManualError] = useState('')
  const [verifyAccountId, setVerifyAccountId] = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [verifySuccess, setVerifySuccess] = useState('')
  const [verifyError, setVerifyError] = useState('')

  const [manualForm, setManualForm] = useState({
    accountHolderName: '', routingNumber: '', accountNumber: '', accountType: 'checking' as 'checking' | 'savings',
  })
  const [verifyForm, setVerifyForm] = useState({ deposit1: '', deposit2: '' })

  const refreshAccounts = () =>
    fetch('/api/bank/accounts').then(r => r.json()).then(d => setBankAccounts(d.accounts ?? []))

  useEffect(() => {
    fetch('/api/wallet/address').then(r => r.json()).then(setAddresses)
    fetch('/api/wallet/balance').then(r => r.json()).then(setBalance)
    refreshAccounts()
  }, [])

  const regenerateWallet = async () => {
    setRegenerating(true)
    const res = await fetch('/api/wallet/regenerate', { method: 'POST' })
    const data = await res.json()
    if (res.ok) setAddresses({ ethereum: data.ethAddress, polygon: data.polyAddress })
    setRegenerating(false)
    setShowRegenConfirm(false)
  }

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const linkViaplaid = async () => {
    setLinkingBank(true)
    try {
      const res = await fetch('/api/bank/plaid/link-token', { method: 'POST' })
      const { linkToken } = await res.json()

      await new Promise<void>((resolve) => {
        if (document.getElementById('plaid-script')) { resolve(); return }
        const script = document.createElement('script')
        script.id = 'plaid-script'
        script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
        script.onload = () => resolve()
        document.head.appendChild(script)
      })

      const handler = (window as any).Plaid.create({
        token: linkToken,
        onSuccess: async (publicToken: string, metadata: any) => {
          const accountId = metadata.accounts[0]?.id
          await fetch('/api/bank/plaid/exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicToken, accountId }),
          })
          await refreshAccounts()
          setAddMethod(null)
        },
        onExit: () => setLinkingBank(false),
      })
      handler.open()
    } catch {
      setLinkingBank(false)
    }
  }

  const submitManual = async (e: React.FormEvent) => {
    e.preventDefault()
    setManualLoading(true)
    setManualError('')
    setManualSuccess('')
    const res = await fetch('/api/bank/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(manualForm),
    })
    const data = await res.json()
    if (res.ok) {
      setManualSuccess(data.message)
      setManualForm({ accountHolderName: '', routingNumber: '', accountNumber: '', accountType: 'checking' })
      setAddMethod(null)
      await refreshAccounts()
    } else {
      setManualError(data.error?.formErrors?.[0] ?? data.error ?? 'Failed to add account')
    }
    setManualLoading(false)
  }

  const submitVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setVerifyLoading(true)
    setVerifyError('')
    setVerifySuccess('')
    const res = await fetch('/api/bank/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bankAccountId: verifyAccountId,
        deposit1: Math.round(parseFloat(verifyForm.deposit1) * 100),
        deposit2: Math.round(parseFloat(verifyForm.deposit2) * 100),
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setVerifySuccess(data.message)
      setVerifyAccountId('')
      setVerifyForm({ deposit1: '', deposit2: '' })
      await refreshAccounts()
    } else {
      setVerifyError(data.error ?? 'Verification failed')
    }
    setVerifyLoading(false)
  }

  const totalUsdc = balance ? (parseFloat(balance.usdc.polygon) + parseFloat(balance.usdc.ethereum)).toFixed(2) : '0.00'
  const totalUsdt = balance ? parseFloat(balance.usdt.ethereum).toFixed(2) : '0.00'
  const unverifiedAccounts = bankAccounts.filter(a => !a.verified)

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900">Wallet</h1>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
          <div className="text-sm opacity-80">USDC Balance</div>
          <div className="text-4xl font-bold mt-1">${totalUsdc}</div>
          <div className="text-xs opacity-60 mt-1">Across Ethereum & Polygon</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl p-6 text-white">
          <div className="text-sm opacity-80">USDT Balance</div>
          <div className="text-4xl font-bold mt-1">${totalUsdt}</div>
          <div className="text-xs opacity-60 mt-1">Ethereum</div>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        {[
          { key: 'crypto', label: 'Crypto Addresses' },
          { key: 'bank', label: `Bank Accounts${bankAccounts.length ? ` (${bankAccounts.length})` : ''}` },
          { key: 'card', label: 'Card Payments' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Crypto tab */}
      {tab === 'crypto' && addresses && (
        <div className="bg-white rounded-2xl border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Deposit Addresses</h2>
            <button onClick={() => setShowRegenConfirm(true)}
              className="flex items-center gap-1.5 text-xs text-gray-500 border rounded-lg px-3 py-1.5 hover:border-orange-400 hover:text-orange-600 transition">
              <RefreshCw size={12} /> Generate New
            </button>
          </div>
          <p className="text-sm text-gray-500">Send USDC or USDT to these addresses to fund your wallet.</p>

          {showRegenConfirm && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-orange-800">
                  <strong>Warning:</strong> Generating new addresses will replace your current ones. Any funds sent to old addresses will still arrive but won't be tracked here. Make sure your old address has no pending incoming transfers.
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={regenerateWallet} disabled={regenerating}
                  className="bg-orange-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-orange-700 transition disabled:opacity-50">
                  {regenerating ? 'Generating...' : 'Yes, Generate New'}
                </button>
                <button onClick={() => setShowRegenConfirm(false)}
                  className="border px-4 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {[
            { label: 'Ethereum / EVM', chain: 'ethereum', addr: addresses.ethereum },
            { label: 'Polygon', chain: 'polygon', addr: addresses.polygon },
          ].map(({ label, chain, addr }) => (
            <div key={chain}>
              <div className="text-xs text-gray-500 mb-1">{label}</div>
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <code className="text-xs text-gray-700 flex-1 truncate">{addr}</code>
                <button onClick={() => copy(addr, chain)} className="text-gray-400 hover:text-indigo-600 transition">
                  {copied === chain ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bank tab */}
      {tab === 'bank' && (
        <div className="space-y-4">

          {/* Linked accounts list */}
          <div className="bg-white rounded-2xl border p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Linked Bank Accounts</h2>
              <div className="flex gap-2">
                <button onClick={() => setAddMethod(addMethod === 'plaid' ? null : 'plaid')}
                  className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-700 transition">
                  <Plus size={12} /> Via Plaid
                </button>
                <button onClick={() => setAddMethod(addMethod === 'manual' ? null : 'manual')}
                  className="flex items-center gap-1.5 bg-white border text-gray-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 transition">
                  <Plus size={12} /> Manual Entry
                </button>
              </div>
            </div>

            {bankAccounts.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Landmark size={32} className="mx-auto mb-2 opacity-40" />
                <div className="text-sm">No bank accounts linked yet</div>
              </div>
            ) : (
              <div className="divide-y">
                {bankAccounts.map(acc => (
                  <div key={acc.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
                        <Landmark size={16} className="text-indigo-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{acc.institutionName}</div>
                        <div className="text-xs text-gray-400">{acc.accountType} ····{acc.accountMask}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${acc.verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {acc.verified ? 'Verified' : 'Pending verification'}
                      </span>
                      {!acc.verified && (
                        <button onClick={() => { setVerifyAccountId(acc.id); document.getElementById('verify-section')?.scrollIntoView({ behavior: 'smooth' }) }}
                          className="text-xs text-indigo-600 underline hover:text-indigo-800">
                          Verify
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Plaid flow */}
          {addMethod === 'plaid' && (
            <div className="bg-white rounded-2xl border p-5 space-y-3">
              <h3 className="font-semibold text-gray-900">Connect via Plaid</h3>
              <p className="text-sm text-gray-500">Instantly connect your bank account. Plaid supports 12,000+ banks and verifies instantly — no micro-deposits needed.</p>
              <button onClick={linkViaplaid} disabled={linkingBank}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
                {linkingBank ? 'Opening Plaid...' : 'Open Plaid Link'}
              </button>
            </div>
          )}

          {/* Manual entry form */}
          {addMethod === 'manual' && (
            <div className="bg-white rounded-2xl border p-5 space-y-4">
              <h3 className="font-semibold text-gray-900">Manual Bank Entry</h3>
              <p className="text-sm text-gray-500">Enter your routing and account number. Stripe will send <strong>two small deposits</strong> (under $1 each) to your account within 1-2 business days. Come back to enter those amounts to verify.</p>

              <form onSubmit={submitManual} className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Account Holder Name</label>
                  <input required value={manualForm.accountHolderName} onChange={e => setManualForm(f => ({ ...f, accountHolderName: e.target.value }))}
                    placeholder="John Doe"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Routing Number</label>
                    <input required value={manualForm.routingNumber} onChange={e => setManualForm(f => ({ ...f, routingNumber: e.target.value }))}
                      placeholder="9 digits" maxLength={9}
                      className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Account Number</label>
                    <input required value={manualForm.accountNumber} onChange={e => setManualForm(f => ({ ...f, accountNumber: e.target.value }))}
                      placeholder="Account number"
                      className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Account Type</label>
                  <select value={manualForm.accountType} onChange={e => setManualForm(f => ({ ...f, accountType: e.target.value as any }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                  </select>
                </div>

                {manualError && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2">{manualError}</div>}
                {manualSuccess && <div className="bg-green-50 text-green-700 text-sm rounded-lg px-3 py-2">{manualSuccess}</div>}

                <button type="submit" disabled={manualLoading}
                  className="w-full bg-gray-900 text-white py-2.5 rounded-xl font-semibold hover:bg-gray-800 transition disabled:opacity-50">
                  {manualLoading ? 'Adding...' : 'Add Bank Account'}
                </button>
              </form>
            </div>
          )}

          {/* Micro-deposit verification */}
          {unverifiedAccounts.length > 0 && (
            <div id="verify-section" className="bg-white rounded-2xl border p-5 space-y-4">
              <h3 className="font-semibold text-gray-900">Verify with Micro-Deposits</h3>
              <p className="text-sm text-gray-500">
                Check your bank account for two small deposits from Stripe (usually arrive in 1-2 business days). Enter the exact amounts in cents below — e.g. if you received $0.32 and $0.45, enter <strong>32</strong> and <strong>45</strong>.
              </p>

              <form onSubmit={submitVerify} className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Select Bank Account to Verify</label>
                  <select value={verifyAccountId} onChange={e => setVerifyAccountId(e.target.value)} required
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                    <option value="">Select account...</option>
                    {unverifiedAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.institutionName} ····{acc.accountMask} ({acc.accountType})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">First Deposit (cents)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-400 text-xs">$0.</span>
                      <input required type="number" min="1" max="99" value={verifyForm.deposit1}
                        onChange={e => setVerifyForm(f => ({ ...f, deposit1: e.target.value }))}
                        placeholder="32"
                        className="w-full border rounded-lg pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Second Deposit (cents)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-400 text-xs">$0.</span>
                      <input required type="number" min="1" max="99" value={verifyForm.deposit2}
                        onChange={e => setVerifyForm(f => ({ ...f, deposit2: e.target.value }))}
                        placeholder="45"
                        className="w-full border rounded-lg pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                    </div>
                  </div>
                </div>

                {verifyError && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2">{verifyError}</div>}
                {verifySuccess && <div className="bg-green-50 text-green-700 text-sm rounded-lg px-3 py-2">{verifySuccess}</div>}

                <button type="submit" disabled={verifyLoading}
                  className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
                  {verifyLoading ? 'Verifying...' : 'Verify Account'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Card tab */}
      {tab === 'card' && (
        <div className="bg-white rounded-2xl border p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Card Payments</h2>
          <p className="text-sm text-gray-500">
            Cards are entered securely at the time of payment via Stripe. FlowPay never stores your card number.
          </p>
          <div className="bg-indigo-50 rounded-xl p-4 flex items-start gap-3">
            <CreditCard size={20} className="text-indigo-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-indigo-700">
              When you choose <strong>Card</strong> on the Send page, you'll enter your card details in a secure Stripe form at checkout.
            </div>
          </div>
          <div className="text-sm text-gray-500 space-y-2">
            {['Visa, Mastercard, Amex accepted', '3D Secure authentication supported', 'PCI-compliant via Stripe'].map(t => (
              <div key={t} className="flex items-center gap-2">
                <span className="w-5 h-5 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">✓</span>
                {t}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
