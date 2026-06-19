import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, unauthorized } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { stripe } from '@/lib/stripe'

const schema = z.object({
  amount: z.number().positive(),
  bankAccountId: z.string(),
  recipientEmail: z.string().email(),
})

export async function POST(req: NextRequest) {
  let user
  try { user = await requireUser() } catch { return unauthorized() }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { amount, bankAccountId, recipientEmail } = parsed.data

  const bankAccount = await prisma.bankAccount.findFirst({
    where: { id: bankAccountId, userId: user.id },
  })
  if (!bankAccount) return NextResponse.json({ error: 'Bank account not found' }, { status: 404 })
  if (!bankAccount.stripePaymentMethodId) return NextResponse.json({ error: 'Bank account not verified with Stripe' }, { status: 400 })

  const receiver = await prisma.user.findUnique({ where: { email: recipientEmail } })
  if (!receiver) return NextResponse.json({ error: 'Recipient not found on FlowPay' }, { status: 404 })

  let customerId = user.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email })
    customerId = customer.id
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } })
  }

  const intent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    customer: customerId,
    payment_method: bankAccount.stripePaymentMethodId,
    payment_method_types: ['us_bank_account'],
    confirm: true,
    mandate_data: {
      customer_acceptance: {
        type: 'online',
        online: { ip_address: req.headers.get('x-forwarded-for') ?? '127.0.0.1', user_agent: req.headers.get('user-agent') ?? '' },
      },
    },
    metadata: { senderId: user.id, receiverId: receiver.id, recipientEmail },
  })

  const tx = await prisma.transaction.create({
    data: {
      senderId: user.id,
      receiverId: receiver.id,
      amount,
      currency: 'USD',
      method: 'ACH',
      status: 'PROCESSING',
      stripePaymentIntentId: intent.id,
    },
  })

  return NextResponse.json({ transactionId: tx.id, status: 'PROCESSING' })
}
