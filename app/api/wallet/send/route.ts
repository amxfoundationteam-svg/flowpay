import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, unauthorized } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { paymentService } from '@/lib/payments/PaymentService'
import { inngest } from '@/lib/inngest'

const schema = z.object({
  recipientEmail: z.string().email().optional(),
  recipientAddress: z.string().optional(),
  amount: z.number().positive(),
  method: z.enum(['USDC_POLYGON', 'USDC_ETH', 'USDT_ETH']),
})

export async function POST(req: NextRequest) {
  let user
  try { user = await requireUser() } catch { return unauthorized() }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { recipientEmail, recipientAddress, amount, method } = parsed.data

  let receiverId = user.id
  if (recipientEmail) {
    const receiver = await prisma.user.findUnique({ where: { email: recipientEmail } })
    if (!receiver) return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
    receiverId = receiver.id
  }

  const result = await paymentService.charge({ method, amount, currency: 'USDC', senderId: user.id, receiverId })

  if (result.txHash) {
    await inngest.send({
      name: 'payment/crypto.pending',
      data: { txHash: result.txHash, transactionId: result.transactionId, chain: method === 'USDC_POLYGON' ? 'polygon' : 'ethereum' },
    })
  }

  return NextResponse.json(result)
}
