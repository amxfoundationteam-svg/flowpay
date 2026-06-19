import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, unauthorized } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db/prisma'

const schema = z.object({
  recipientName: z.string().min(1),
  recipientEmail: z.string().email(),
  accountHolderName: z.string().min(1),
  routingNumber: z.string().min(9).max(9),
  accountNumber: z.string().min(4),
  accountType: z.enum(['checking', 'savings']).default('checking'),
  amount: z.number().positive(),
  memo: z.string().optional(),
})

export async function POST(req: NextRequest) {
  let user
  try { user = await requireUser() } catch { return unauthorized() }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { recipientName, recipientEmail, accountHolderName, routingNumber, accountNumber, accountType, amount, memo } = parsed.data

  try {
    // Create a bank account token for the recipient
    const bankToken = await stripe.tokens.create({
      bank_account: {
        country: 'US',
        currency: 'usd',
        account_holder_name: accountHolderName,
        account_holder_type: 'individual',
        routing_number: routingNumber,
        account_number: accountNumber,
      },
    })

    // Stripe payouts go to the connected account's external bank account.
    // In sandbox/test mode, we record the payout as PROCESSING.
    // In production this would use stripe.payouts.create with a connected account destination.
    const payout = await prisma.payout.create({
      data: {
        userId: user.id,
        recipientName,
        recipientEmail,
        amount,
        currency: 'USD',
        method: 'ACH',
        status: 'PROCESSING',
        memo,
        stripePayoutId: bankToken.id, // store token as reference in test mode
      },
    })

    return NextResponse.json({ payoutId: payout.id, status: 'PROCESSING' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Payout failed' }, { status: 400 })
  }
}
