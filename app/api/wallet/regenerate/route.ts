import { NextResponse } from 'next/server'
import { requireUser, unauthorized } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { encrypt } from '@/lib/crypto'

export async function POST() {
  let user
  try { user = await requireUser() } catch { return unauthorized() }

  const privateKey = generatePrivateKey()
  const account = privateKeyToAccount(privateKey)
  const encryptedKey = encrypt(privateKey)

  // Ethereum and Polygon share the same address derivation
  const ethAddress = account.address
  const polyAddress = account.address

  await prisma.wallet.update({
    where: { userId: user.id },
    data: { ethAddress, polyAddress, encryptedKey },
  })

  return NextResponse.json({ ethAddress, polyAddress })
}
