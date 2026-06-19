import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, unauthorized } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db/prisma'

const schema = z.object({
  amount: z.number().positive(),
  receiverId: z.string(),
  paymentMethodId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  let user
  try { user = await requireUser() } catch { return unauthorized() }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { amount, receiverId, paymentMethodId } = parsed.data

  let customerId = user.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, name: user.name ?? undefined })
    customerId = customer.id
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } })
  }

  const intent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    customer: customerId,
    payment_method: paymentMethodId,
    automatic_payment_methods: paymentMethodId ? undefined : { enabled: true },
    metadata: { senderId: user.id, receiverId },
  })

  const tx = await prisma.transaction.create({
    data: {
      senderId: user.id,
      receiverId,
      amount,
      currency: 'USD',
      method: 'CARD',
      status: 'PENDING',
      stripePaymentIntentId: intent.id,
    },
  })

  return NextResponse.json({ clientSecret: intent.client_secret, transactionId: tx.id })
}
