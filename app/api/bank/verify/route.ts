import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, unauthorized } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { stripe } from '@/lib/stripe'

const schema = z.object({
  bankAccountId: z.string(),
  deposit1: z.number().int().positive(), // in cents e.g. 32 for $0.32
  deposit2: z.number().int().positive(),
})

export async function POST(req: NextRequest) {
  let user
  try { user = await requireUser() } catch { return unauthorized() }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { bankAccountId, deposit1, deposit2 } = parsed.data

  const bankAccount = await prisma.bankAccount.findFirst({
    where: { id: bankAccountId, userId: user.id },
  })
  if (!bankAccount) return NextResponse.json({ error: 'Bank account not found' }, { status: 404 })
  if (bankAccount.verified) return NextResponse.json({ error: 'Already verified' }, { status: 400 })
  if (!bankAccount.stripePaymentMethodId) return NextResponse.json({ error: 'No Stripe bank account linked' }, { status: 400 })

  const customerId = user.stripeCustomerId
  if (!customerId) return NextResponse.json({ error: 'No Stripe customer' }, { status: 400 })

  try {
    await stripe.customers.verifySource(customerId, bankAccount.stripePaymentMethodId, {
      amounts: [deposit1, deposit2],
    })

    await prisma.bankAccount.update({
      where: { id: bankAccountId },
      data: { verified: true },
    })

    return NextResponse.json({ verified: true, message: 'Bank account verified successfully!' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Verification failed. Check your deposit amounts.' }, { status: 400 })
  }
}
