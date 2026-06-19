import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'
import { createUserWallet } from '@/lib/wallet'
import { NextResponse } from 'next/server'

export async function requireUser() {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  let user = await prisma.user.findUnique({ where: { clerkId: userId }, include: { wallet: true } })

  if (!user) {
    const clerkUser = await currentUser()
    const walletData = await createUserWallet()
    user = await prisma.user.create({
      data: {
        clerkId: userId,
        email: clerkUser?.emailAddresses[0]?.emailAddress ?? '',
        name: clerkUser?.fullName ?? null,
        wallet: {
          create: {
            ethAddress: walletData.address,
            polyAddress: walletData.address,
            encryptedKey: walletData.encryptedKey,
          },
        },
      },
      include: { wallet: true },
    })
  }

  return user
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
