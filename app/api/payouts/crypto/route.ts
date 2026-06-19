import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, unauthorized } from '@/lib/auth'
import { paymentService } from '@/lib/payments/PaymentService'
import { inngest } from '@/lib/inngest'

const schema = z.object({
  recipientName: z.string(),
  recipientEmail: z.string().email(),
  recipientAddress: z.string(),
  amount: z.number().positive(),
  method: z.enum(['USDC_POLYGON', 'USDC_ETH', 'USDT_ETH']),
  memo: z.string().optional(),
})

export async function POST(req: NextRequest) {
  let user
  try { user = await requireUser() } catch { return unauthorized() }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const result = await paymentService.payout({
    currency: parsed.data.method === 'USDT_ETH' ? 'USDT' : 'USDC',
    userId: user.id,
    ...parsed.data,
  })

  if (result.txHash) {
    await inngest.send({
      name: 'payment/crypto.pending',
      data: { txHash: result.txHash, transactionId: result.payoutId, chain: parsed.data.method === 'USDC_POLYGON' ? 'polygon' : 'ethereum' },
    })
  }

  return NextResponse.json(result)
}
