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

const statusBadge: Record<string, string> = {
  CONFIRMED: 'text-gold border-gold/30 bg-gold/8',
  PROCESSING: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/8',
  PENDING: 'text-muted-foreground border-border bg-secondary',
  FAILED: 'text-red-400 border-red-500/30 bg-red-500/8',
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
    { label: 'Volume Received', value: `$${Number(stats.volumeReceived).toFixed(2)}`, icon: ArrowDownLeft },
    { label: 'Volume Sent', value: `$${Number(stats.volumeSent).toFixed(2)}`, icon: ArrowUpRight },
    { label: 'Transactions', value: stats.transactionCount, icon: TrendingUp },
    { label: 'Crypto %', value: `${stats.cryptoPercent}%`, icon: Coins },
    { label: 'Invoices Paid', value: stats.invoicesPaid, icon: FileText },
  ] : []

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-serif font-normal text-2xl tracking-wide text-foreground">Dashboard</h1>
        <div className="flex gap-1.5">
          {['24h', '7d', '30d'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 text-[10px] tracking-[0.14em] uppercase transition-colors ${
                period === p
                  ? 'bg-gold text-rx-bg font-semibold'
                  : 'text-muted-foreground bg-card hover:text-foreground'
              }`}
              style={{ border: period === p ? 'none' : '1px solid rgba(201,146,42,0.2)' }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {cards.map(c => (
          <div key={c.label} className="bg-card p-5" style={{ border: '1px solid rgba(201,146,42,0.15)' }}>
            <div className="w-8 h-8 flex items-center justify-center text-gold mb-4"
              style={{ border: '1px solid rgba(201,146,42,0.2)' }}>
              <c.icon size={15} />
            </div>
            <div className="font-serif text-2xl font-normal text-foreground tabular-nums">{c.value}</div>
            <div className="text-[10px] tracking-[0.1em] uppercase text-muted-foreground mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-card" style={{ border: '1px solid rgba(201,146,42,0.15)' }}>
        <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(201,146,42,0.12)' }}>
          <span className="text-[9px] tracking-[0.28em] uppercase text-gold">Recent Transactions</span>
        </div>
        <div>
          {txs.length === 0 && (
            <div className="p-10 text-center text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
              No transactions yet
            </div>
          )}
          {txs.map((tx, i) => (
            <div key={tx.id} className="flex items-center justify-between px-5 py-4 hover:bg-gold/5 transition-colors"
              style={{ borderBottom: i < txs.length - 1 ? '1px solid rgba(201,146,42,0.08)' : 'none' }}>
              <div>
                <div className="text-sm text-foreground">
                  {tx.sender?.email} → {tx.receiver?.email}
                </div>
                <div className="text-[10px] tracking-[0.08em] text-muted-foreground mt-0.5">
                  {tx.method} · {new Date(tx.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 border ${statusBadge[tx.status] ?? 'text-muted-foreground border-border bg-secondary'}`}>
                  {tx.status}
                </span>
                <span className="text-sm font-medium text-foreground tabular-nums">
                  ${Number(tx.amount).toFixed(2)} {tx.currency}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
