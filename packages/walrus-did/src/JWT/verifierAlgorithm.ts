import { base64ToBytes, bytesToHex } from 'did-jwt'
import { VerificationMethod } from 'did-resolver'
import { EcdsaSignature, KNOWN_JWA } from './type'
import { verifierZkLogin } from './verifierZkLogin'

type Verifier = (data: string, signature: string, authenticators: VerificationMethod[]) => Promise<VerificationMethod>

type Algorithms = Record<KNOWN_JWA, Verifier>

const algorithms: Algorithms = {
  zkLogin: verifierZkLogin,
}

export function toSignatureObject(signature: string, recoverable = false): EcdsaSignature {
  const rawSig: Uint8Array = base64ToBytes(signature)
  if (rawSig.length !== (recoverable ? 65 : 64)) {
    throw new Error('wrong signature length')
  }
  const r: string = bytesToHex(rawSig.slice(0, 32))
  const s: string = bytesToHex(rawSig.slice(32, 64))
  const sigObj: EcdsaSignature = { r, s }
  if (recoverable) {
    sigObj.recoveryParam = rawSig[64]
  }
  return sigObj
}

function VerifierAlgorithm(alg: string): Verifier {
  const impl: Verifier = algorithms[alg as KNOWN_JWA]
  if (!impl) throw new Error(`not_supported: Unsupported algorithm ${alg}`)
  return impl
}

VerifierAlgorithm.toSignatureObject = toSignatureObject

export default VerifierAlgorithm
