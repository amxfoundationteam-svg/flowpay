import { NextRequest, NextResponse } from 'next/server'
import { requireUser, unauthorized } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  let user
  try { user = await requireUser() } catch { return unauthorized() }

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')

  const transactions = await prisma.transaction.findMany({
    where: {
      OR: [{ senderId: user.id }, { receiverId: user.id }],
      method: { in: ['USDC_POLYGON', 'USDC_ETH', 'USDT_ETH'] },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      sender: { select: { email: true, name: true } },
      receiver: { select: { email: true, name: true } },
    },
  })

  return NextResponse.json({ transactions })
}
