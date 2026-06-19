import { NextRequest, NextResponse } from 'next/server'
import { requireUser, unauthorized } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { inngest } from '@/lib/inngest'

function generateSlug() {
  return Math.random().toString(36).slice(2, 10)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let user
  try { user = await requireUser() } catch { return unauthorized() }

  const invoice = await prisma.invoice.findFirst({ where: { id: params.id, issuerId: user.id } })
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const paymentLink = invoice.paymentLink ?? generateSlug()

  await prisma.invoice.update({
    where: { id: params.id },
    data: { status: 'SENT', paymentLink },
  })

  await inngest.send({ name: 'invoice/send', data: { invoiceId: params.id } })

  return NextResponse.json({ paymentLink })
}
