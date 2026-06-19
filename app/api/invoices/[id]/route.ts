import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, unauthorized } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  let user
  try { user = await requireUser() } catch { return unauthorized() }

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, issuerId: user.id },
    include: { lineItems: true, issuer: { select: { name: true, email: true } } },
  })

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ invoice })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let user
  try { user = await requireUser() } catch { return unauthorized() }

  const body = await req.json()
  const invoice = await prisma.invoice.update({
    where: { id: params.id },
    data: body,
  })

  return NextResponse.json({ invoice })
}
