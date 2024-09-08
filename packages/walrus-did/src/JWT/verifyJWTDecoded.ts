import { VerificationMethod } from 'did-resolver'
import { decodeJWT, JWT_ERROR } from 'did-jwt'
import VerifierAlgorithm from './verifierAlgorithm'
import { JWTDecoded } from './conditionalAlgorithm'

export async function verifyJWTDecoded(
  { header, payload, data, signature }: JWTDecoded,
  pubKeys: VerificationMethod | VerificationMethod[]
): Promise<VerificationMethod> {
  if (!Array.isArray(pubKeys)) pubKeys = [pubKeys]

  const iss = payload.iss
  let recurse = true
  do {
    if (iss !== payload.iss) throw new Error(`${JWT_ERROR.INVALID_JWT}: multiple issuers`)

    try {
      const result = VerifierAlgorithm(header.alg)(data, signature, pubKeys)

      return result
    } catch (e) {
      if (!(e as Error).message.startsWith(JWT_ERROR.INVALID_SIGNATURE)) throw e
    }

    // TODO probably best to create copy objects than replace reference objects
    if (header.cty !== 'JWT') {
      recurse = false
    } else {
      ;({ payload, header, signature, data } = decodeJWT(payload.jwt, false))
    }
  } while (recurse)

  throw new Error(`${JWT_ERROR.INVALID_SIGNATURE}: no matching public key found`)
}
