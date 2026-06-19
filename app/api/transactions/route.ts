import { NextRequest, NextResponse } from 'next/server'
import { requireUser, unauthorized } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  let user
  try { user = await requireUser() } catch { return unauthorized() }

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where: { OR: [{ senderId: user.id }, { receiverId: user.id }] },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        sender: { select: { email: true, name: true } },
        receiver: { select: { email: true, name: true } },
      },
    }),
    prisma.transaction.count({ where: { OR: [{ senderId: user.id }, { receiverId: user.id }] } }),
  ])

  return NextResponse.json({ transactions, total, pages: Math.ceil(total / limit) })
}
