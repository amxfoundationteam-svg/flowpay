import { NextRequest, NextResponse } from 'next/server'
import { requireUser, unauthorized } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  try { await requireUser() } catch { return unauthorized() }

  const rxUsername = new URL(req.url).searchParams.get('rxUsername')
  if (!rxUsername) return NextResponse.json({ error: 'rxUsername required' }, { status: 400 })

  const username = rxUsername.replace(/^RX\$/i, '').trim()
  if (!username) return NextResponse.json({ error: 'Invalid RX username' }, { status: 400 })

  const user = await prisma.user.findFirst({
    where: { rxUsername: { equals: username, mode: 'insensitive' } },
    include: { wallet: true },
  })

  if (!user || !user.wallet) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json({
    rxUsername: `RX$${user.rxUsername}`,
    displayName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
    ethAddress: user.wallet.ethAddress,
    polyAddress: user.wallet.polyAddress,
  })
}
