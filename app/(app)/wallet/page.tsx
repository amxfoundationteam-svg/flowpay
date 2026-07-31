'use client'
import { useEffect, useState } from 'react'
import { Copy, CheckCircle, Plus, Landmark, CreditCard, RefreshCw, AlertTriangle } from 'lucide-react'

interface Addresses { ethereum: string; polygon: string }
interface Balance { usdc: { polygon: string; ethereum: string }; usdt: { ethereum: string } }
interface BankAccount { id: string; institutionName: string; accountMask: string; accountType: string; verified: boolean }

type AddMethod = 'plaid' | 'manual' | null

const INPUT = 'w-full bg-secondary border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold transition'
const BORDER = { border: '1px solid rgba(201,146,42,0.15)' }

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
    fetch('/api/bank/accounts').then(r => r.ok ? r.json() : null).then(d => { if (d) setBankAccounts(d.accounts ?? []) })

  useEffect(() => {
    fetch('/api/wallet/address').then(r => r.ok ? r.json() : null).then(d => { if (d?.ethereum) setAddresses(d) })
    fetch('/api/wallet/balance').then(r => r.ok ? r.json() : null).then(d => { if (d?.usdc) setBalance(d) })
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

  const totalUsdc = balance?.usdc ? (parseFloat(balance.usdc.polygon ?? '0') + parseFloat(balance.usdc.ethereum ?? '0')).toFixed(2) : '0.00'
  const totalUsdt = balance?.usdt ? parseFloat(balance.usdt.ethereum ?? '0').toFixed(2) : '0.00'
  const unverifiedAccounts = bankAccounts.filter(a => !a.verified)

  const tabs = [
    { key: 'crypto', label: 'Crypto Addresses' },
    { key: 'bank', label: `Bank Accounts${bankAccounts.length ? ` (${bankAccounts.length})` : ''}` },
    { key: 'card', label: 'Card Payments' },
  ]

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="font-serif font-normal text-2xl tracking-wide text-foreground">Wallet</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-6" style={{ background: 'rgba(201,146,42,0.06)', border: '1px solid rgba(201,146,42,0.25)' }}>
          <div className="text-[10px] tracking-[0.18em] uppercase text-gold/70">USDC Balance</div>
          <div className="font-serif text-4xl font-normal text-gold mt-1 tabular-nums">${totalUsdc}</div>
          <div className="text-[10px] text-muted-foreground mt-1">Ethereum & Polygon</div>
        </div>
        <div className="p-6" style={{ background: 'rgba(201,146,42,0.04)', border: '1px solid rgba(201,146,42,0.15)' }}>
          <div className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground">USDT Balance</div>
          <div className="font-serif text-4xl font-normal text-foreground mt-1 tabular-nums">${totalUsdt}</div>
          <div className="text-[10px] text-muted-foreground mt-1">Ethereum</div>
        </div>
      </div>

      <div className="flex" style={{ borderBottom: '1px solid rgba(201,146,42,0.15)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`px-4 py-2.5 text-[10px] tracking-[0.14em] uppercase transition-colors -mb-px ${
              tab === t.key
                ? 'text-gold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            style={{ borderBottom: tab === t.key ? '2px solid #C9922A' : '2px solid transparent' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Crypto tab */}
      {tab === 'crypto' && addresses && (
        <div className="bg-card p-5 space-y-4" style={BORDER}>
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Deposit Addresses</h2>
            <button onClick={() => setShowRegenConfirm(true)}
              className="flex items-center gap-1.5 text-[10px] tracking-[0.1em] uppercase text-muted-foreground hover:text-gold transition-colors px-3 py-1.5"
              style={{ border: '1px solid rgba(201,146,42,0.2)' }}>
              <RefreshCw size={11} /> Generate New
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Send USDC or USDT to these addresses to fund your wallet.</p>

          {showRegenConfirm && (
            <div className="p-4 space-y-3" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-400/90">
                  <strong>Warning:</strong> Generating new addresses replaces your current ones. Funds sent to old addresses still arrive but won't be tracked here.
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={regenerateWallet} disabled={regenerating}
                  className="bg-gold text-rx-bg px-4 py-1.5 text-[10px] tracking-[0.12em] uppercase font-semibold hover:bg-gold-light transition-colors disabled:opacity-50">
                  {regenerating ? 'Generating...' : 'Yes, Generate New'}
                </button>
                <button onClick={() => setShowRegenConfirm(false)}
                  className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground hover:text-foreground px-4 py-1.5 transition-colors"
                  style={{ border: '1px solid rgba(201,146,42,0.2)' }}>
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
              <div className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground mb-1">{label}</div>
              <div className="flex items-center gap-2 bg-secondary px-3 py-2.5" style={{ border: '1px solid rgba(201,146,42,0.12)' }}>
                <code className="text-xs text-foreground flex-1 truncate font-mono">{addr}</code>
                <button onClick={() => copy(addr, chain)} className="text-muted-foreground hover:text-gold transition-colors flex-shrink-0">
                  {copied === chain ? <CheckCircle size={15} className="text-gold" /> : <Copy size={15} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bank tab */}
      {tab === 'bank' && (
        <div className="space-y-4">
          <div className="bg-card p-5 space-y-3" style={BORDER}>
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Linked Bank Accounts</h2>
              <div className="flex gap-2">
                <button onClick={() => setAddMethod(addMethod === 'plaid' ? null : 'plaid')}
                  className="flex items-center gap-1.5 bg-gold text-rx-bg px-3 py-1.5 text-[10px] tracking-[0.1em] uppercase font-semibold hover:bg-gold-light transition-colors">
                  <Plus size={11} /> Via Plaid
                </button>
                <button onClick={() => setAddMethod(addMethod === 'manual' ? null : 'manual')}
                  className="flex items-center gap-1.5 text-[10px] tracking-[0.1em] uppercase text-muted-foreground hover:text-foreground px-3 py-1.5 transition-colors"
                  style={{ border: '1px solid rgba(201,146,42,0.2)' }}>
                  <Plus size={11} /> Manual
                </button>
              </div>
            </div>

            {bankAccounts.length === 0 ? (
              <div className="text-center py-10">
                <Landmark size={28} className="mx-auto mb-2 text-muted-foreground/30" />
                <div className="text-[10px] tracking-[0.16em] uppercase text-muted-foreground">No bank accounts linked yet</div>
              </div>
            ) : (
              <div>
                {bankAccounts.map((acc, i) => (
                  <div key={acc.id} className="flex items-center justify-between py-3"
                    style={{ borderTop: i > 0 ? '1px solid rgba(201,146,42,0.08)' : 'none' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 flex items-center justify-center text-gold"
                        style={{ border: '1px solid rgba(201,146,42,0.2)' }}>
                        <Landmark size={14} />
                      </div>
                      <div>
                        <div className="text-sm text-foreground">{acc.institutionName}</div>
                        <div className="text-[10px] text-muted-foreground">{acc.accountType} ····{acc.accountMask}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 border ${
                        acc.verified
                          ? 'text-gold border-gold/30 bg-gold/8'
                          : 'text-yellow-400 border-yellow-500/30 bg-yellow-500/8'
                      }`}>
                        {acc.verified ? 'Verified' : 'Pending'}
                      </span>
                      {!acc.verified && (
                        <button onClick={() => { setVerifyAccountId(acc.id); document.getElementById('verify-section')?.scrollIntoView({ behavior: 'smooth' }) }}
                          className="text-[10px] tracking-[0.1em] uppercase text-gold hover:text-gold-light transition-colors">
                          Verify
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {addMethod === 'plaid' && (
            <div className="bg-card p-5 space-y-3" style={BORDER}>
              <h3 className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Connect via Plaid</h3>
              <p className="text-xs text-muted-foreground">Instantly connect your bank — 12,000+ banks supported. No micro-deposits needed.</p>
              <button onClick={linkViaplaid} disabled={linkingBank}
                className="w-full bg-gold text-rx-bg py-2.5 text-[11px] tracking-[0.16em] uppercase font-semibold hover:bg-gold-light transition-colors disabled:opacity-50">
                {linkingBank ? 'Opening Plaid...' : 'Open Plaid Link'}
              </button>
            </div>
          )}

          {addMethod === 'manual' && (
            <div className="bg-card p-5 space-y-4" style={BORDER}>
              <h3 className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Manual Bank Entry</h3>
              <p className="text-xs text-muted-foreground">
                Stripe sends two small deposits (under $1) to verify. Enter those amounts to complete verification.
              </p>
              <form onSubmit={submitManual} className="space-y-3">
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-1">Account Holder Name</label>
                  <input required value={manualForm.accountHolderName}
                    onChange={e => setManualForm(f => ({ ...f, accountHolderName: e.target.value }))}
                    placeholder="John Doe" className={INPUT} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-muted-foreground mb-1">Routing Number</label>
                    <input required value={manualForm.routingNumber}
                      onChange={e => setManualForm(f => ({ ...f, routingNumber: e.target.value }))}
                      placeholder="9 digits" maxLength={9} className={`${INPUT} font-mono`} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-foreground mb-1">Account Number</label>
                    <input required value={manualForm.accountNumber}
                      onChange={e => setManualForm(f => ({ ...f, accountNumber: e.target.value }))}
                      placeholder="Account number" className={`${INPUT} font-mono`} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-1">Account Type</label>
                  <select value={manualForm.accountType}
                    onChange={e => setManualForm(f => ({ ...f, accountType: e.target.value as any }))}
                    className={INPUT}>
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                  </select>
                </div>
                {manualError && <div className="text-xs text-red-400 px-3 py-2" style={{ border: '1px solid rgba(239,68,68,0.2)' }}>{manualError}</div>}
                {manualSuccess && <div className="text-xs text-gold px-3 py-2" style={{ border: '1px solid rgba(201,146,42,0.2)' }}>{manualSuccess}</div>}
                <button type="submit" disabled={manualLoading}
                  className="w-full bg-gold text-rx-bg py-2.5 text-[11px] tracking-[0.16em] uppercase font-semibold hover:bg-gold-light transition-colors disabled:opacity-50">
                  {manualLoading ? 'Adding...' : 'Add Bank Account'}
                </button>
              </form>
            </div>
          )}

          {unverifiedAccounts.length > 0 && (
            <div id="verify-section" className="bg-card p-5 space-y-4" style={BORDER}>
              <h3 className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Verify with Micro-Deposits</h3>
              <p className="text-xs text-muted-foreground">
                Check your bank for two small Stripe deposits. Enter the amounts in cents — e.g. $0.32 = <strong className="text-foreground">32</strong>.
              </p>
              <form onSubmit={submitVerify} className="space-y-3">
                <div>
                  <label className="block text-[10px] text-muted-foreground mb-1">Select Account</label>
                  <select value={verifyAccountId} onChange={e => setVerifyAccountId(e.target.value)} required className={INPUT}>
                    <option value="">Select account...</option>
                    {unverifiedAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.institutionName} ····{acc.accountMask} ({acc.accountType})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { field: 'deposit1', label: 'First Deposit (cents)' },
                    { field: 'deposit2', label: 'Second Deposit (cents)' },
                  ].map(({ field, label }) => (
                    <div key={field}>
                      <label className="block text-[10px] text-muted-foreground mb-1">{label}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground text-[10px]">$0.</span>
                        <input required type="number" min="1" max="99"
                          value={(verifyForm as any)[field]}
                          onChange={e => setVerifyForm(f => ({ ...f, [field]: e.target.value }))}
                          placeholder="32" className={`${INPUT} pl-8`} />
                      </div>
                    </div>
                  ))}
                </div>
                {verifyError && <div className="text-xs text-red-400 px-3 py-2" style={{ border: '1px solid rgba(239,68,68,0.2)' }}>{verifyError}</div>}
                {verifySuccess && <div className="text-xs text-gold px-3 py-2" style={{ border: '1px solid rgba(201,146,42,0.2)' }}>{verifySuccess}</div>}
                <button type="submit" disabled={verifyLoading}
                  className="w-full bg-gold text-rx-bg py-2.5 text-[11px] tracking-[0.16em] uppercase font-semibold hover:bg-gold-light transition-colors disabled:opacity-50">
                  {verifyLoading ? 'Verifying...' : 'Verify Account'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Card tab */}
      {tab === 'card' && (
        <div className="bg-card p-5 space-y-4" style={BORDER}>
          <h2 className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Card Payments</h2>
          <p className="text-xs text-muted-foreground">
            Cards are entered securely at the time of payment via Stripe. River X never stores your card number.
          </p>
          <div className="p-4 flex items-start gap-3" style={{ background: 'rgba(201,146,42,0.05)', border: '1px solid rgba(201,146,42,0.18)' }}>
            <CreditCard size={16} className="text-gold mt-0.5 flex-shrink-0" />
            <p className="text-xs text-foreground/80">
              When you choose <strong>Card</strong> on the Send page, your card details are entered in a secure Stripe form at checkout.
            </p>
          </div>
          <div className="space-y-2">
            {['Visa, Mastercard, Amex accepted', '3D Secure authentication supported', 'PCI-compliant via Stripe'].map(t => (
              <div key={t} className="flex items-center gap-2">
                <span className="w-4 h-4 flex items-center justify-center text-gold flex-shrink-0">✓</span>
                <span className="text-xs text-muted-foreground">{t}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
