import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Alchemy address activity webhook
  const activities = body?.event?.activity ?? []
  for (const activity of activities) {
    if (activity.category === 'token' && activity.asset === 'USDC') {
      const wallet = await prisma.wallet.findFirst({
        where: {
          OR: [
            { ethAddress: activity.toAddress },
            { polyAddress: activity.toAddress },
          ],
        },
        include: { user: true },
      })

      if (wallet) {
        // Update balance cache in DB
        const newBalance = parseFloat(wallet.usdcBalance.toString()) + parseFloat(activity.value ?? '0')
        await prisma.wallet.update({
          where: { id: wallet.id },
          data: { usdcBalance: newBalance },
        })
      }
    }
  }

  return NextResponse.json({ received: true })
}
