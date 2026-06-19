import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, unauthorized } from '@/lib/auth'
import { plaidClient } from '@/lib/plaid'
import { prisma } from '@/lib/db/prisma'
import { encrypt } from '@/lib/crypto'
import { stripe } from '@/lib/stripe'

const schema = z.object({ publicToken: z.string(), accountId: z.string() })

export async function POST(req: NextRequest) {
  let user
  try { user = await requireUser() } catch { return unauthorized() }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { publicToken, accountId } = parsed.data

  const exchange = await plaidClient.itemPublicTokenExchange({ public_token: publicToken })
  const accessToken = exchange.data.access_token

  const authRes = await plaidClient.authGet({ access_token: accessToken })
  const account = authRes.data.accounts.find(a => a.account_id === accountId)
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  const institution = authRes.data.item.institution_id ?? 'Unknown'

  let customerId = user.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email })
    customerId = customer.id
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } })
  }

  const stripeToken = await plaidClient.processorStripeBankAccountTokenCreate({
    access_token: accessToken,
    account_id: accountId,
  })

  const pm = await stripe.paymentMethods.create({
    type: 'us_bank_account',
    us_bank_account: { account_holder_type: 'individual' },
  } as Parameters<typeof stripe.paymentMethods.create>[0])

  const bankAccount = await prisma.bankAccount.create({
    data: {
      userId: user.id,
      plaidAccessToken: encrypt(accessToken),
      plaidAccountId: accountId,
      institutionName: institution,
      accountMask: account.mask ?? '****',
      accountType: account.subtype ?? 'checking',
      stripePaymentMethodId: stripeToken.data.stripe_bank_account_token,
    },
  })

  return NextResponse.json({ bankAccountId: bankAccount.id })
}
