'use client'
import { useEffect, useState } from 'react'
import { Copy, CheckCircle } from 'lucide-react'

export default function ReceivePage() {
  const [addresses, setAddresses] = useState<{ ethereum: string; polygon: string } | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/wallet/address').then(r => r.json()).then(setAddresses)
  }, [])

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const BORDER = { border: '1px solid rgba(201,146,42,0.15)' }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-serif font-normal text-2xl tracking-wide text-foreground">Receive Funds</h1>

      <div className="bg-card p-6 space-y-6" style={BORDER}>
        <p className="text-xs text-muted-foreground">
          Share your wallet addresses to receive USDC or USDT directly. Both addresses are EVM-compatible.
        </p>

        {addresses ? (
          [
            { label: 'Ethereum (ETH Mainnet)', chain: 'ethereum', addr: addresses.ethereum, tokens: 'USDC, USDT' },
            { label: 'Polygon (MATIC)', chain: 'polygon', addr: addresses.polygon, tokens: 'USDC' },
          ].map(({ label, chain, addr, tokens }) => (
            <div key={chain} className="space-y-2">
              <div>
                <div className="text-xs font-medium text-foreground">{label}</div>
                <div className="text-[10px] tracking-[0.1em] text-muted-foreground">Accepts: {tokens}</div>
              </div>
              <div className="flex items-center gap-2 bg-secondary px-3 py-3" style={{ border: '1px solid rgba(201,146,42,0.12)' }}>
                <code className="text-xs text-foreground flex-1 break-all font-mono">{addr}</code>
                <button onClick={() => copy(addr, chain)} className="ml-2 text-muted-foreground hover:text-gold transition-colors flex-shrink-0">
                  {copied === chain ? <CheckCircle size={16} className="text-gold" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-xs text-muted-foreground">Loading addresses...</div>
        )}

        <div className="p-4 text-xs text-foreground/80" style={{ background: 'rgba(201,146,42,0.05)', border: '1px solid rgba(201,146,42,0.18)' }}>
          <strong className="text-gold">Note:</strong> Only send USDC or USDT to these addresses. Sending other tokens may result in permanent loss.
        </div>
      </div>
    </div>
  )
}
