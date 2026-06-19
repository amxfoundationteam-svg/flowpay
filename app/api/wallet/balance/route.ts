import { NextRequest, NextResponse } from 'next/server'
import { requireUser, unauthorized } from '@/lib/auth'
import { ethPublicClient, polygonPublicClient, ERC20_ABI, USDC_CONTRACTS, USDT_CONTRACTS } from '@/lib/viem'
import { formatUnits } from 'viem'

export async function GET(req: NextRequest) {
  let user
  try { user = await requireUser() } catch { return unauthorized() }

  if (!user.wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })

  const ethAddr = user.wallet.ethAddress as `0x${string}`
  const polyAddr = user.wallet.polyAddress as `0x${string}`

  const [usdcPoly, usdcEth, usdtEth] = await Promise.all([
    polygonPublicClient.readContract({ address: USDC_CONTRACTS.polygon, abi: ERC20_ABI, functionName: 'balanceOf', args: [polyAddr] }).catch(() => BigInt(0)),
    ethPublicClient.readContract({ address: USDC_CONTRACTS.ethereum, abi: ERC20_ABI, functionName: 'balanceOf', args: [ethAddr] }).catch(() => BigInt(0)),
    ethPublicClient.readContract({ address: USDT_CONTRACTS.ethereum, abi: ERC20_ABI, functionName: 'balanceOf', args: [ethAddr] }).catch(() => BigInt(0)),
  ])

  return NextResponse.json({
    usdc: {
      polygon: formatUnits(usdcPoly as bigint, 6),
      ethereum: formatUnits(usdcEth as bigint, 6),
    },
    usdt: {
      ethereum: formatUnits(usdtEth as bigint, 6),
    },
  })
}
