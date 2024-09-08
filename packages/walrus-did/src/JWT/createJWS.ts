import { JWTHeader, JWTPayload, Signer } from 'did-jwt'
import { JWSCreationOptions, SignerAlgorithm } from './type'
import { encodeSection } from './encodeSection'
import SignerAlg from './signerAlgorithm'

export async function createJWS(
  payload: string | Partial<JWTPayload>,
  signer: Signer,
  header: Partial<JWTHeader> = {},
  options: JWSCreationOptions = {}
): Promise<string> {
  if (!header.alg) header.alg = 'zkLogin'
  const encodedPayload = typeof payload === 'string' ? payload : encodeSection(payload, options.canonicalize)
  const signingInput: string = [encodeSection(header, options.canonicalize), encodedPayload].join('.')

  const jwtSigner: SignerAlgorithm = SignerAlg(header.alg)
  const signature: string = await jwtSigner(signingInput, signer)

  // JWS Compact Serialization
  // https://www.rfc-editor.org/rfc/rfc7515#section-7.1
  return [signingInput, signature].join('.')
}
