'use client'
import { useEffect, useState } from 'react'
import { TrendingUp, ArrowDownLeft, ArrowUpRight, FileText, Coins } from 'lucide-react'

interface Stats {
  period: string
  volumeReceived: number
  volumeSent: number
  transactionCount: number
  cryptoPercent: number
  invoicesPaid: number
}

interface Transaction {
  id: string
  amount: number
  currency: string
  method: string
  status: string
  createdAt: string
  sender: { email: string; name: string | null }
  receiver: { email: string; name: string | null }
}

const statusColors: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-700',
  PROCESSING: 'bg-yellow-100 text-yellow-700',
  PENDING: 'bg-gray-100 text-gray-600',
  FAILED: 'bg-red-100 text-red-700',
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [txs, setTxs] = useState<Transaction[]>([])
  const [period, setPeriod] = useState('7d')

  useEffect(() => {
    fetch(`/api/dashboard/stats?period=${period}`).then(r => r.json()).then(setStats)
    fetch('/api/transactions?limit=10').then(r => r.json()).then(d => setTxs(d.transactions ?? []))
  }, [period])

  const cards = stats ? [
    { label: 'Volume Received', value: `$${Number(stats.volumeReceived).toFixed(2)}`, icon: ArrowDownLeft, color: 'text-green-600' },
    { label: 'Volume Sent', value: `$${Number(stats.volumeSent).toFixed(2)}`, icon: ArrowUpRight, color: 'text-blue-600' },
    { label: 'Transactions', value: stats.transactionCount, icon: TrendingUp, color: 'text-purple-600' },
    { label: 'Crypto %', value: `${stats.cryptoPercent}%`, icon: Coins, color: 'text-orange-600' },
    { label: 'Invoices Paid', value: stats.invoicesPaid, icon: FileText, color: 'text-indigo-600' },
  ] : []

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-2">
          {['24h', '7d', '30d'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${period === p ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-2xl p-5 border shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50 mb-3 ${c.color}`}>
              <c.icon size={20} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{c.value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border shadow-sm">
        <div className="p-5 border-b">
          <h2 className="font-semibold text-gray-900">Recent Transactions</h2>
        </div>
        <div className="divide-y">
          {txs.length === 0 && <div className="p-8 text-center text-gray-400">No transactions yet</div>}
          {txs.map(tx => (
            <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {tx.sender?.email} → {tx.receiver?.email}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {tx.method} · {new Date(tx.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[tx.status] ?? 'bg-gray-100'}`}>
                  {tx.status}
                </span>
                <span className="font-semibold text-gray-900">${Number(tx.amount).toFixed(2)} {tx.currency}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
