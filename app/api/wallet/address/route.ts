import { NextRequest, NextResponse } from 'next/server'
import { requireUser, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest) {
  let user
  try { user = await requireUser() } catch { return unauthorized() }

  if (!user.wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })

  return NextResponse.json({
    ethereum: user.wallet.ethAddress,
    polygon: user.wallet.polyAddress,
  })
}
