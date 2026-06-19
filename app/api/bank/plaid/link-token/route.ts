import { NextRequest, NextResponse } from 'next/server'
import { requireUser, unauthorized } from '@/lib/auth'
import { plaidClient } from '@/lib/plaid'
import { CountryCode, Products } from 'plaid'

export async function POST(req: NextRequest) {
  let user
  try { user = await requireUser() } catch { return unauthorized() }

  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: user.id },
    client_name: 'FlowPay',
    products: [Products.Auth],
    country_codes: [CountryCode.Us],
    language: 'en',
  })

  return NextResponse.json({ linkToken: response.data.link_token })
}
