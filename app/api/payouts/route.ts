import { NextRequest, NextResponse } from 'next/server'
import { requireUser, unauthorized } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  let user
  try { user = await requireUser() } catch { return unauthorized() }

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1')

  const payouts = await prisma.payout.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * 20,
    take: 20,
  })

  return NextResponse.json({ payouts })
}
