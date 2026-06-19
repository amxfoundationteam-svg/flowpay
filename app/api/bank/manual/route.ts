import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, unauthorized } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { stripe } from '@/lib/stripe'

const schema = z.object({
  accountHolderName: z.string().min(1),
  routingNumber: z.string().length(9, 'Routing number must be 9 digits'),
  accountNumber: z.string().min(4),
  accountType: z.enum(['checking', 'savings']),
})

export async function POST(req: NextRequest) {
  let user
  try { user = await requireUser() } catch { return unauthorized() }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { accountHolderName, routingNumber, accountNumber, accountType } = parsed.data

  // Create or get Stripe customer
  let customerId = user.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, name: user.name ?? undefined })
    customerId = customer.id
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } })
  }

  // Create bank account token via Stripe
  const bankToken = await stripe.tokens.create({
    bank_account: {
      country: 'US',
      currency: 'usd',
      account_holder_name: accountHolderName,
      account_holder_type: 'individual',
      routing_number: routingNumber,
      account_number: accountNumber,
      account_type: accountType,
    },
  })

  // Attach to customer for micro-deposit verification
  const bankAccount = await stripe.customers.createSource(customerId, {
    source: bankToken.id,
  }) as any

  // Save to DB (unverified — pending micro-deposits)
  const saved = await prisma.bankAccount.create({
    data: {
      userId: user.id,
      plaidAccessToken: '',
      plaidAccountId: '',
      institutionName: 'Manual Entry',
      accountMask: accountNumber.slice(-4),
      accountType,
      verified: false,
      stripePaymentMethodId: bankAccount.id,
    },
  })

  return NextResponse.json({
    bankAccountId: saved.id,
    stripeBankAccountId: bankAccount.id,
    message: 'Bank account added. Stripe will send two small deposits within 1-2 business days. Come back to verify them.',
  }, { status: 201 })
}
