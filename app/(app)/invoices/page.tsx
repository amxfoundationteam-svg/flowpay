'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Send } from 'lucide-react'

interface Invoice {
  id: string
  number: string
  clientName: string
  clientEmail: string
  total: number
  currency: string
  status: string
  dueDate: string
  createdAt: string
}

const statusBadge: Record<string, string> = {
  DRAFT: 'text-muted-foreground border-border bg-secondary',
  SENT: 'text-blue-400 border-blue-400/30 bg-blue-400/8',
  PAID: 'text-gold border-gold/30 bg-gold/8',
  OVERDUE: 'text-red-400 border-red-500/30 bg-red-500/8',
  CANCELLED: 'text-muted-foreground/50 border-border bg-secondary',
}

const INPUT = 'w-full bg-secondary border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold transition'
const BORDER = { border: '1px solid rgba(201,146,42,0.15)' }

const PAYMENT_METHODS = [
  { value: 'CARD', label: 'Credit / Debit Card' },
  { value: 'ACH', label: 'ACH / Bank Transfer' },
  { value: 'USDC_POLYGON', label: 'USDC (Polygon)' },
  { value: 'USDC_ETH', label: 'USDC (Ethereum)' },
  { value: 'USDT_ETH', label: 'USDT (Ethereum)' },
]

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    clientName: '', clientEmail: '', dueDate: '', currency: 'USD',
    paymentMethods: ['CARD', 'ACH'],
    lineItems: [{ description: '', quantity: 1, unitPrice: 0 }],
  })

  useEffect(() => {
    fetch('/api/invoices').then(r => r.json()).then(d => setInvoices(d.invoices ?? []))
  }, [])

  const toggleMethod = (m: string) => setForm(f => ({
    ...f,
    paymentMethods: f.paymentMethods.includes(m)
      ? f.paymentMethods.filter(x => x !== m)
      : [...f.paymentMethods, m],
  }))

  const addLine = () => setForm(f => ({ ...f, lineItems: [...f.lineItems, { description: '', quantity: 1, unitPrice: 0 }] }))

  const updateLine = (i: number, field: string, value: string | number) => {
    setForm(f => ({ ...f, lineItems: f.lineItems.map((li, idx) => idx === i ? { ...li, [field]: value } : li) }))
  }

  const total = form.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (res.ok) {
      setInvoices(prev => [data.invoice, ...prev])
      setShowForm(false)
    }
    setLoading(false)
  }

  const sendInvoice = async (id: string) => {
    await fetch(`/api/invoices/${id}/send`, { method: 'POST' })
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'SENT' } : inv))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif font-normal text-2xl tracking-wide text-foreground">Invoices</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-gold text-rx-bg px-4 py-2 text-[10px] tracking-[0.16em] uppercase font-semibold hover:bg-gold-light transition-colors">
          <Plus size={13} /> New Invoice
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-card p-6 space-y-5" style={BORDER}>
          <h2 className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Create Invoice</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Client Name</label>
              <input required value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} className={INPUT} />
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Client Email</label>
              <input required type="email" value={form.clientEmail} onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))} className={INPUT} />
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Due Date</label>
              <input required type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className={INPUT} />
            </div>
          </div>

          <div>
            <label className="block text-[10px] tracking-[0.14em] uppercase text-muted-foreground mb-2">Accept Payment Methods</label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map(m => {
                const on = form.paymentMethods.includes(m.value)
                return (
                  <button key={m.value} type="button" onClick={() => toggleMethod(m.value)}
                    className={`flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${
                      on ? 'text-gold bg-gold/8' : 'text-muted-foreground bg-secondary hover:text-foreground'
                    }`}
                    style={{ border: on ? '1px solid rgba(201,146,42,0.4)' : '1px solid rgba(201,146,42,0.12)' }}>
                    <span className={`w-3.5 h-3.5 flex items-center justify-center flex-shrink-0 text-[9px] ${
                      on ? 'bg-gold text-rx-bg' : 'bg-secondary'
                    }`} style={{ border: on ? 'none' : '1px solid rgba(201,146,42,0.2)' }}>
                      {on && '✓'}
                    </span>
                    {m.label}
                  </button>
                )
              })}
            </div>
            {form.paymentMethods.length === 0 && (
              <p className="text-[10px] text-red-400 mt-1">Select at least one payment method</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] tracking-[0.14em] uppercase text-muted-foreground">Line Items</label>
              <button type="button" onClick={addLine} className="text-[10px] tracking-[0.1em] uppercase text-gold hover:text-gold-light transition-colors">
                + Add line
              </button>
            </div>
            {form.lineItems.map((li, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                <input placeholder="Description" value={li.description}
                  onChange={e => updateLine(i, 'description', e.target.value)}
                  className={`col-span-6 ${INPUT}`} />
                <input type="number" placeholder="Qty" value={li.quantity}
                  onChange={e => updateLine(i, 'quantity', parseInt(e.target.value))}
                  className={`col-span-2 ${INPUT}`} />
                <input type="number" placeholder="Price" value={li.unitPrice}
                  onChange={e => updateLine(i, 'unitPrice', parseFloat(e.target.value))}
                  className={`col-span-3 ${INPUT}`} />
                <div className="col-span-1 flex items-center justify-center text-xs text-muted-foreground tabular-nums">
                  ${(li.quantity * li.unitPrice).toFixed(0)}
                </div>
              </div>
            ))}
            <div className="text-right text-sm text-foreground mt-2 font-medium tabular-nums">
              Total: ${total.toFixed(2)}
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-gold text-rx-bg py-2.5 text-[11px] tracking-[0.18em] uppercase font-semibold hover:bg-gold-light transition-colors disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Invoice'}
          </button>
        </form>
      )}

      <div className="bg-card" style={BORDER}>
        {invoices.length === 0 && (
          <div className="p-10 text-center text-[10px] tracking-[0.18em] uppercase text-muted-foreground">No invoices yet</div>
        )}
        {invoices.map((inv, i) => (
          <div key={inv.id} className="flex items-center justify-between px-5 py-4 hover:bg-gold/5 transition-colors"
            style={{ borderTop: i > 0 ? '1px solid rgba(201,146,42,0.08)' : 'none' }}>
            <div>
              <div className="text-sm text-foreground">{inv.number} · {inv.clientName}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {inv.clientEmail} · Due {new Date(inv.dueDate).toLocaleDateString()}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 border ${statusBadge[inv.status]}`}>
                {inv.status}
              </span>
              <span className="text-sm font-medium text-foreground tabular-nums">
                {inv.currency} {Number(inv.total).toFixed(2)}
              </span>
              {inv.status === 'DRAFT' && (
                <button onClick={() => sendInvoice(inv.id)} className="text-gold hover:text-gold-light transition-colors">
                  <Send size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
