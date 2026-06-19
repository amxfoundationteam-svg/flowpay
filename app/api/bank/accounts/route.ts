import { NextRequest, NextResponse } from 'next/server'
import { requireUser, unauthorized } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  let user
  try { user = await requireUser() } catch { return unauthorized() }

  const accounts = await prisma.bankAccount.findMany({
    where: { userId: user.id },
    select: { id: true, institutionName: true, accountMask: true, accountType: true, verified: true },
  })

  return NextResponse.json({ accounts })
}
