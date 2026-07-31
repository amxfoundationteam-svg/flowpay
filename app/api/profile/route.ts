import { NextRequest, NextResponse } from 'next/server'
import { requireUser, unauthorized } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  let user
  try { user = await requireUser() } catch { return unauthorized() }
  return NextResponse.json({
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    rxUsername: user.rxUsername,
  })
}

export async function PATCH(req: NextRequest) {
  let user
  try { user = await requireUser() } catch { return unauthorized() }

  const { firstName, lastName, rxUsername } = await req.json()

  if (rxUsername !== undefined && rxUsername !== null && rxUsername !== '') {
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(rxUsername)) {
      return NextResponse.json(
        { error: 'RX username must be 3–20 characters: letters, numbers, or underscores only.' },
        { status: 400 }
      )
    }
    const taken = await prisma.user.findFirst({
      where: { rxUsername: { equals: rxUsername, mode: 'insensitive' }, NOT: { id: user.id } },
    })
    if (taken) {
      return NextResponse.json({ error: 'That RX username is already taken.' }, { status: 409 })
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: firstName ?? user.firstName,
      lastName: lastName ?? user.lastName,
      name: [firstName ?? user.firstName, lastName ?? user.lastName].filter(Boolean).join(' ') || user.name,
      rxUsername: rxUsername !== undefined ? (rxUsername || null) : user.rxUsername,
    },
  })

  return NextResponse.json({
    success: true,
    firstName: updated.firstName,
    lastName: updated.lastName,
    rxUsername: updated.rxUsername,
  })
}
