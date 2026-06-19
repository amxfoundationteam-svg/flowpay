import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { stripe } from '@/lib/stripe'

const schema = z.object({
  email: z.string().email(),
  method: z.string(),
  // Card
  cardNumber: z.string().optional(),
  cardExpiry: z.string().optional(),
  cardCvc: z.string().optional(),
  cardName: z.string().optional(),
  // ACH
  routingNumber: z.string().optional(),
  accountNumber: z.string().optional(),
  accountHolderName: z.string().optional(),
  accountType: z.string().optional(),
  // Crypto
  walletAddress: z.string().optional(),
  txHash: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: { params: { paymentLink: string } }) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const invoice = await prisma.invoice.findUnique({ where: { paymentLink: params.paymentLink } })
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (invoice.status === 'PAID') return NextResponse.json({ error: 'Already paid' }, { status: 400 })

  const { email, method, cardNumber, cardExpiry, cardCvc, cardName,
    routingNumber, accountNumber, accountHolderName, accountType,
    walletAddress, txHash } = parsed.data

  const amountCents = Math.round(Number(invoice.total) * 100)

  try {
    if (method === 'CARD') {
      // Create Stripe token from raw card details
      const [expMonth, expYear] = (cardExpiry ?? '').split('/')
      const token = await stripe.tokens.create({
        card: {
          number: (cardNumber ?? '').replace(/\s/g, ''),
          exp_month: parseInt(expMonth ?? '12'),
          exp_year: parseInt(expYear ?? '25'),
          cvc: cardCvc ?? '',
          name: cardName ?? '',
        },
      } as any)

      const charge = await stripe.charges.create({
        amount: amountCents,
        currency: invoice.currency.toLowerCase(),
        source: token.id,
        description: `Invoice ${invoice.number}`,
        receipt_email: email,
        metadata: { invoiceId: invoice.id, payerEmail: email },
      })

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'PAID', paidAt: new Date(), transactionId: charge.id },
      })

      return NextResponse.json({ status: 'paid' })
    }

    if (method === 'ACH') {
      // Create bank account token and charge via Stripe
      const bankToken = await stripe.tokens.create({
        bank_account: {
          country: 'US',
          currency: 'usd',
          account_holder_name: accountHolderName ?? '',
          account_holder_type: 'individual',
          routing_number: routingNumber ?? '',
          account_number: accountNumber ?? '',
          account_type: (accountType ?? 'checking') as any,
        },
      })

      // Create a temporary customer for the payer
      const customer = await stripe.customers.create({ email })
      const bankAccount = await stripe.customers.createSource(customer.id, { source: bankToken.id }) as any

      // For ACH we create a PaymentIntent since direct charge requires verified account
      const intent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'usd',
        customer: customer.id,
        payment_method_data: {
          type: 'us_bank_account',
          us_bank_account: {
            routing_number: routingNumber ?? '',
            account_number: accountNumber ?? '',
            account_holder_type: 'individual',
          },
          billing_details: { email, name: accountHolderName ?? '' },
        },
        payment_method_types: ['us_bank_account'],
        confirm: true,
        mandate_data: {
          customer_acceptance: {
            type: 'online',
            online: {
              ip_address: req.headers.get('x-forwarded-for') ?? '127.0.0.1',
              user_agent: req.headers.get('user-agent') ?? '',
            },
          },
        },
        metadata: { invoiceId: invoice.id, payerEmail: email },
      })

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'PAID', paidAt: new Date(), transactionId: intent.id },
      })

      return NextResponse.json({ status: 'processing', message: 'ACH transfer initiated. Funds arrive in 1-3 business days.' })
    }

    if (method.startsWith('USDC') || method.startsWith('USDT')) {
      // For crypto: trust the provided txHash (in production, verify on-chain)
      if (!txHash) return NextResponse.json({ error: 'Transaction hash required' }, { status: 400 })

      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'PAID', paidAt: new Date(), transactionId: txHash },
      })

      return NextResponse.json({ status: 'paid' })
    }

    return NextResponse.json({ error: 'Unsupported payment method' }, { status: 400 })

  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Payment failed' }, { status: 400 })
  }
}
