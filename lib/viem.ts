import { createPublicClient, createWalletClient, http } from 'viem'
import { mainnet, polygon } from 'viem/chains'

export const ethPublicClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.ALCHEMY_ETH_RPC),
})

export const polygonPublicClient = createPublicClient({
  chain: polygon,
  transport: http(process.env.ALCHEMY_POLYGON_RPC),
})

export const USDC_CONTRACTS = {
  polygon: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as `0x${string}`,
  ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as `0x${string}`,
}

export const USDT_CONTRACTS = {
  ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7' as `0x${string}`,
}

export const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const
