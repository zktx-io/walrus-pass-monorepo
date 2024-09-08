import { base64ToBytes, extractPublicKeyBytes } from 'did-jwt'
import { VerificationMethod } from 'did-resolver'
import { sha256 as sha256Hash } from '@noble/hashes/sha256'
import { SuiGraphQLClient } from '@mysten/sui/graphql'
import { ZkLoginPublicIdentifier } from '@mysten/sui/zklogin'

export async function verifierZkLogin(
  data: string,
  signature: string,
  authenticators: VerificationMethod[]
): Promise<VerificationMethod> {
  let signer: VerificationMethod | undefined = undefined

  if (authenticators[0]) {
    try {
      const { keyBytes } = extractPublicKeyBytes(authenticators[0])
      const parsed = authenticators[0].controller.split(':')
      const network = parsed.length === 3 ? 'mainnet' : parsed[2]
      const client = new SuiGraphQLClient({
        url: `https://sui-${network}.mystenlabs.com/graphql`,
      })
      const zkLoginPublicIdentifier = new ZkLoginPublicIdentifier(keyBytes, { client })
      const bytes = base64ToBytes(signature)
      const result = await zkLoginPublicIdentifier.verifyPersonalMessage(
        sha256Hash(new TextEncoder().encode(data)),
        bytes
      )
      if (result) {
        signer = authenticators[0]
      }
    } catch (error) {
      console.error(error)
    }
  }
  if (!signer) throw new Error('invalid_signature: Signature invalid for JWT')
  return signer
}
