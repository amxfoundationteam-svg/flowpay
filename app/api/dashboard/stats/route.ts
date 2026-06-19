import { NextRequest, NextResponse } from 'next/server'
import { requireUser, unauthorized } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  let user
  try { user = await requireUser() } catch { return unauthorized() }

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') ?? '7d'

  const daysMap: Record<string, number> = { '24h': 1, '7d': 7, '30d': 30 }
  const days = daysMap[period] ?? 7
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const [received, sent, cryptoTxs, invoicesPaid] = await Promise.all([
    prisma.transaction.aggregate({
      where: { receiverId: user.id, status: 'CONFIRMED', createdAt: { gte: since } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.aggregate({
      where: { senderId: user.id, status: 'CONFIRMED', createdAt: { gte: since } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.count({
      where: {
        OR: [{ senderId: user.id }, { receiverId: user.id }],
        method: { in: ['USDC_POLYGON', 'USDC_ETH', 'USDT_ETH'] },
        status: 'CONFIRMED',
        createdAt: { gte: since },
      },
    }),
    prisma.invoice.count({ where: { issuerId: user.id, status: 'PAID', paidAt: { gte: since } } }),
  ])

  const totalTxs = received._count + sent._count
  const cryptoPercent = totalTxs > 0 ? Math.round((cryptoTxs / totalTxs) * 100) : 0

  return NextResponse.json({
    period,
    volumeReceived: received._sum.amount ?? 0,
    volumeSent: sent._sum.amount ?? 0,
    transactionCount: totalTxs,
    cryptoPercent,
    invoicesPaid,
  })
}
