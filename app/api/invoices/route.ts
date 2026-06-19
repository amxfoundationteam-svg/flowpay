import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, unauthorized } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { inngest } from '@/lib/inngest'

const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
})

const createSchema = z.object({
  clientEmail: z.string().email(),
  clientName: z.string(),
  dueDate: z.string(),
  currency: z.string().default('USD'),
  paymentMethods: z.array(z.string()),
  lineItems: z.array(lineItemSchema),
})

export async function POST(req: NextRequest) {
  let user
  try { user = await requireUser() } catch { return unauthorized() }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { clientEmail, clientName, dueDate, currency, paymentMethods, lineItems } = parsed.data
  const total = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0)

  const count = await prisma.invoice.count({ where: { issuerId: user.id } })
  const number = `INV-${String(count + 1).padStart(4, '0')}`

  const invoice = await prisma.invoice.create({
    data: {
      number,
      issuerId: user.id,
      clientEmail,
      clientName,
      dueDate: new Date(dueDate),
      currency,
      total,
      paymentMethods,
      lineItems: {
        create: lineItems.map(li => ({
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          total: li.quantity * li.unitPrice,
        })),
      },
    },
    include: { lineItems: true },
  })

  return NextResponse.json({ invoice }, { status: 201 })
}

export async function GET(req: NextRequest) {
  let user
  try { user = await requireUser() } catch { return unauthorized() }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') ?? '1')

  const invoices = await prisma.invoice.findMany({
    where: { issuerId: user.id, ...(status ? { status: status as any } : {}) },
    include: { lineItems: true },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * 20,
    take: 20,
  })

  return NextResponse.json({ invoices })
}
