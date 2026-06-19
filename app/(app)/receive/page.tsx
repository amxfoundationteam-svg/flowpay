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

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Receive Funds</h1>

      <div className="bg-white rounded-2xl border p-6 space-y-6">
        <p className="text-sm text-gray-500">
          Share your wallet addresses to receive USDC or USDT directly. Both addresses are EVM-compatible.
        </p>

        {addresses ? (
          [
            { label: 'Ethereum (ETH Mainnet)', chain: 'ethereum', addr: addresses.ethereum, tokens: 'USDC, USDT' },
            { label: 'Polygon (MATIC)', chain: 'polygon', addr: addresses.polygon, tokens: 'USDC' },
          ].map(({ label, chain, addr, tokens }) => (
            <div key={chain} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">{label}</div>
                  <div className="text-xs text-gray-400">Accepts: {tokens}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-3">
                <code className="text-xs text-gray-700 flex-1 break-all">{addr}</code>
                <button onClick={() => copy(addr, chain)} className="ml-2 text-gray-400 hover:text-indigo-600 transition flex-shrink-0">
                  {copied === chain ? <CheckCircle size={18} className="text-green-500" /> : <Copy size={18} />}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm text-gray-400">Loading addresses...</div>
        )}

        <div className="bg-indigo-50 rounded-xl p-4 text-sm text-indigo-700">
          <strong>Note:</strong> Only send USDC or USDT to these addresses. Sending other tokens may result in permanent loss.
        </div>
      </div>
    </div>
  )
}
