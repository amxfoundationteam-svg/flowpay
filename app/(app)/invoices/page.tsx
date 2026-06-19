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

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-400',
}

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
        <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
          <Plus size={16} /> New Invoice
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Create Invoice</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Client Name</label>
              <input required value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Client Email</label>
              <input required type="email" value={form.clientEmail} onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Due Date</label>
              <input required type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-2 block">Accept Payment Methods</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'CARD', label: '💳 Credit / Debit Card' },
                { value: 'ACH', label: '🏦 ACH / Bank Transfer' },
                { value: 'USDC_POLYGON', label: '🪙 USDC (Polygon)' },
                { value: 'USDC_ETH', label: '🪙 USDC (Ethereum)' },
                { value: 'USDT_ETH', label: '🪙 USDT (Ethereum)' },
              ].map(m => (
                <button key={m.value} type="button" onClick={() => toggleMethod(m.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition ${form.paymentMethods.includes(m.value) ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${form.paymentMethods.includes(m.value) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                    {form.paymentMethods.includes(m.value) && <span className="text-white text-xs">✓</span>}
                  </span>
                  {m.label}
                </button>
              ))}
            </div>
            {form.paymentMethods.length === 0 && (
              <p className="text-xs text-red-500 mt-1">Select at least one payment method</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500">Line Items</label>
              <button type="button" onClick={addLine} className="text-xs text-indigo-600 hover:underline">+ Add line</button>
            </div>
            {form.lineItems.map((li, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                <input placeholder="Description" value={li.description} onChange={e => updateLine(i, 'description', e.target.value)} className="col-span-6 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                <input type="number" placeholder="Qty" value={li.quantity} onChange={e => updateLine(i, 'quantity', parseInt(e.target.value))} className="col-span-2 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                <input type="number" placeholder="Price" value={li.unitPrice} onChange={e => updateLine(i, 'unitPrice', parseFloat(e.target.value))} className="col-span-3 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                <div className="col-span-1 flex items-center justify-center text-sm font-medium text-gray-600">
                  ${(li.quantity * li.unitPrice).toFixed(0)}
                </div>
              </div>
            ))}
            <div className="text-right text-sm font-semibold text-gray-900 mt-2">Total: ${total.toFixed(2)}</div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Invoice'}
          </button>
        </form>
      )}

      <div className="bg-white rounded-2xl border shadow-sm">
        <div className="divide-y">
          {invoices.length === 0 && <div className="p-8 text-center text-gray-400">No invoices yet</div>}
          {invoices.map(inv => (
            <div key={inv.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div>
                <div className="text-sm font-medium text-gray-900">{inv.number} · {inv.clientName}</div>
                <div className="text-xs text-gray-400 mt-0.5">{inv.clientEmail} · Due {new Date(inv.dueDate).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[inv.status]}`}>{inv.status}</span>
                <span className="font-semibold text-gray-900">{inv.currency} {Number(inv.total).toFixed(2)}</span>
                {inv.status === 'DRAFT' && (
                  <button onClick={() => sendInvoice(inv.id)} className="text-indigo-600 hover:text-indigo-800 transition">
                    <Send size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
