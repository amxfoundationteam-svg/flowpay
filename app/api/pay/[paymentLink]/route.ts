import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest, { params }: { params: { paymentLink: string } }) {
  const invoice = await prisma.invoice.findUnique({
    where: { paymentLink: params.paymentLink },
    include: { lineItems: true, issuer: { select: { name: true, email: true } } },
  })

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ invoice })
}
