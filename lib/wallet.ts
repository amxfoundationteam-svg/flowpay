import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { encrypt } from './crypto'

export async function createUserWallet() {
  const privateKey = generatePrivateKey()
  const account = privateKeyToAccount(privateKey)
  return {
    address: account.address,
    encryptedKey: encrypt(privateKey),
  }
}
