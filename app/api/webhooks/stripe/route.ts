import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db/prisma'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent
      await prisma.transaction.updateMany({
        where: { stripePaymentIntentId: pi.id },
        data: { status: 'CONFIRMED' },
      })
      break
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent
      await prisma.transaction.updateMany({
        where: { stripePaymentIntentId: pi.id },
        data: { status: 'FAILED' },
      })
      break
    }
    case 'payout.paid': {
      const payout = event.data.object as Stripe.Payout
      await prisma.payout.updateMany({
        where: { stripePayoutId: payout.id },
        data: { status: 'SENT' },
      })
      break
    }
    case 'payout.failed': {
      const payout = event.data.object as Stripe.Payout
      await prisma.payout.updateMany({
        where: { stripePayoutId: payout.id },
        data: { status: 'FAILED' },
      })
      break
    }
  }

  return NextResponse.json({ received: true })
}
