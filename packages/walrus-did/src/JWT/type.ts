import { Signer } from 'did-jwt'

export type KNOWN_VERIFICATION_METHOD = 'zkLoginSignatureVerification'

export type PublicKeyTypes = Record<KNOWN_JWA, KNOWN_VERIFICATION_METHOD[]>

export type KNOWN_JWA = 'zkLogin'

export const SUPPORTED_PUBLIC_KEY_TYPES: PublicKeyTypes = {
  zkLogin: ['zkLoginSignatureVerification'],
}

export interface EcdsaSignature {
  r: string
  s: string
  recoveryParam?: number
}

export const NBF_SKEW = 300

export interface JWSCreationOptions {
  canonicalize?: boolean
}

export type SignerAlgorithm = (payload: string, signer: Signer) => Promise<string>
