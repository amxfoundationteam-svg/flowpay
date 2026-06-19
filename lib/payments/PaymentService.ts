import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db/prisma'
import { decrypt } from '@/lib/crypto'
import { ethPublicClient, polygonPublicClient, ERC20_ABI, USDC_CONTRACTS, USDT_CONTRACTS } from '@/lib/viem'
import { createWalletClient, http, parseUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet, polygon } from 'viem/chains'

export interface ChargeParams {
  method: 'CARD' | 'ACH' | 'USDC_POLYGON' | 'USDC_ETH' | 'USDT_ETH'
  amount: number
  currency: string
  senderId: string
  receiverId: string
  stripeCustomerId?: string
  stripePaymentMethodId?: string
  metadata?: Record<string, string>
}

export interface ChargeResult {
  transactionId: string
  clientSecret?: string
  txHash?: string
  status: string
}

export interface PayoutParams {
  method: 'CARD' | 'ACH' | 'USDC_POLYGON' | 'USDC_ETH' | 'USDT_ETH'
  amount: number
  currency: string
  userId: string
  recipientName: string
  recipientEmail: string
  recipientAddress?: string
  stripeDestination?: string
  memo?: string
}

export interface PayoutResult {
  payoutId: string
  txHash?: string
  stripePayoutId?: string
  status: string
}

type Chain = 'polygon' | 'ethereum'

export class PaymentService {
  async charge(params: ChargeParams): Promise<ChargeResult> {
    switch (params.method) {
      case 'CARD':        return this.chargeCard(params)
      case 'ACH':         return this.chargeACH(params)
      case 'USDC_POLYGON': return this.chargeStablecoin(params, 'polygon')
      case 'USDC_ETH':    return this.chargeStablecoin(params, 'ethereum')
      case 'USDT_ETH':    return this.chargeStablecoin(params, 'ethereum')
    }
  }

  async payout(params: PayoutParams): Promise<PayoutResult> {
    switch (params.method) {
      case 'ACH':          return this.payoutToBank(params)
      case 'USDC_POLYGON': return this.payoutCrypto(params, 'polygon')
      case 'USDC_ETH':
      case 'USDT_ETH':     return this.payoutCrypto(params, 'ethereum')
      default:             throw new Error(`Unsupported payout method: ${params.method}`)
    }
  }

  private async chargeCard(params: ChargeParams): Promise<ChargeResult> {
    const amountCents = Math.round(params.amount * 100)
    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      customer: params.stripeCustomerId,
      payment_method: params.stripePaymentMethodId,
      confirm: !!params.stripePaymentMethodId,
      metadata: { senderId: params.senderId, receiverId: params.receiverId, ...params.metadata },
    })

    const tx = await prisma.transaction.create({
      data: {
        senderId: params.senderId,
        receiverId: params.receiverId,
        amount: params.amount,
        currency: 'USD',
        method: 'CARD',
        status: 'PENDING',
        stripePaymentIntentId: intent.id,
        metadata: params.metadata ?? {},
      },
    })

    return { transactionId: tx.id, clientSecret: intent.client_secret ?? undefined, status: 'PENDING' }
  }

  private async chargeACH(params: ChargeParams): Promise<ChargeResult> {
    const amountCents = Math.round(params.amount * 100)
    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      customer: params.stripeCustomerId,
      payment_method: params.stripePaymentMethodId,
      payment_method_types: ['us_bank_account'],
      confirm: true,
      metadata: { senderId: params.senderId, receiverId: params.receiverId },
    })

    const tx = await prisma.transaction.create({
      data: {
        senderId: params.senderId,
        receiverId: params.receiverId,
        amount: params.amount,
        currency: 'USD',
        method: 'ACH',
        status: 'PROCESSING',
        stripePaymentIntentId: intent.id,
      },
    })

    return { transactionId: tx.id, status: 'PROCESSING' }
  }

  private async chargeStablecoin(params: ChargeParams, chain: Chain): Promise<ChargeResult> {
    const wallet = await prisma.wallet.findUnique({ where: { userId: params.senderId } })
    if (!wallet) throw new Error('Sender wallet not found')

    const receiverWallet = await prisma.wallet.findUnique({ where: { userId: params.receiverId } })
    if (!receiverWallet) throw new Error('Receiver wallet not found')

    const privateKey = decrypt(wallet.encryptedKey) as `0x${string}`
    const account = privateKeyToAccount(privateKey)

    const isPolygon = chain === 'polygon'
    const viemChain = isPolygon ? polygon : mainnet
    const rpc = isPolygon ? process.env.ALCHEMY_POLYGON_RPC! : process.env.ALCHEMY_ETH_RPC!

    const contractAddress = params.method === 'USDT_ETH'
      ? USDT_CONTRACTS.ethereum
      : isPolygon ? USDC_CONTRACTS.polygon : USDC_CONTRACTS.ethereum

    const walletClient = createWalletClient({ account, chain: viemChain, transport: http(rpc) })
    const toAddress = isPolygon ? receiverWallet.polyAddress as `0x${string}` : receiverWallet.ethAddress as `0x${string}`

    const txHash = await walletClient.writeContract({
      address: contractAddress,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [toAddress, parseUnits(params.amount.toString(), 6)],
    })

    const tx = await prisma.transaction.create({
      data: {
        senderId: params.senderId,
        receiverId: params.receiverId,
        amount: params.amount,
        currency: params.method === 'USDT_ETH' ? 'USDT' : 'USDC',
        method: params.method,
        status: 'PROCESSING',
        onChainTxHash: txHash,
      },
    })

    return { transactionId: tx.id, txHash, status: 'PROCESSING' }
  }

  private async payoutToBank(params: PayoutParams): Promise<PayoutResult> {
    const stripePayout = await stripe.payouts.create({
      amount: Math.round(params.amount * 100),
      currency: 'usd',
      destination: params.stripeDestination!,
      metadata: { userId: params.userId, recipientEmail: params.recipientEmail },
    })

    const payout = await prisma.payout.create({
      data: {
        userId: params.userId,
        recipientName: params.recipientName,
        recipientEmail: params.recipientEmail,
        amount: params.amount,
        currency: 'USD',
        method: 'ACH',
        status: 'PROCESSING',
        memo: params.memo,
        stripePayoutId: stripePayout.id,
      },
    })

    return { payoutId: payout.id, stripePayoutId: stripePayout.id, status: 'PROCESSING' }
  }

  private async payoutCrypto(params: PayoutParams, chain: Chain): Promise<PayoutResult> {
    if (!params.recipientAddress) throw new Error('Recipient address required for crypto payout')

    const wallet = await prisma.wallet.findUnique({ where: { userId: params.userId } })
    if (!wallet) throw new Error('Wallet not found')

    const privateKey = decrypt(wallet.encryptedKey) as `0x${string}`
    const account = privateKeyToAccount(privateKey)

    const isPolygon = chain === 'polygon'
    const viemChain = isPolygon ? polygon : mainnet
    const rpc = isPolygon ? process.env.ALCHEMY_POLYGON_RPC! : process.env.ALCHEMY_ETH_RPC!

    const contractAddress = params.method === 'USDT_ETH'
      ? USDT_CONTRACTS.ethereum
      : isPolygon ? USDC_CONTRACTS.polygon : USDC_CONTRACTS.ethereum

    const walletClient = createWalletClient({ account, chain: viemChain, transport: http(rpc) })

    const txHash = await walletClient.writeContract({
      address: contractAddress,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [params.recipientAddress as `0x${string}`, parseUnits(params.amount.toString(), 6)],
    })

    const payout = await prisma.payout.create({
      data: {
        userId: params.userId,
        recipientName: params.recipientName,
        recipientEmail: params.recipientEmail,
        amount: params.amount,
        currency: params.method === 'USDT_ETH' ? 'USDT' : 'USDC',
        method: params.method,
        status: 'PROCESSING',
        memo: params.memo,
        onChainTxHash: txHash,
      },
    })

    return { payoutId: payout.id, txHash, status: 'PROCESSING' }
  }
}

export const paymentService = new PaymentService()
