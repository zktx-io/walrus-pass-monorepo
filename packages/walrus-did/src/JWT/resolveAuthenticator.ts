import { JWT_ERROR } from 'did-jwt'
import { DIDDocument, DIDResolutionResult, Resolvable, VerificationMethod } from 'did-resolver'
import { KNOWN_JWA, SUPPORTED_PUBLIC_KEY_TYPES } from './type'

export type ProofPurposeTypes =
  | 'assertionMethod'
  | 'authentication'
  // | 'keyAgreement' // keyAgreement VerificationMethod should not be used for signing
  | 'capabilityDelegation'
  | 'capabilityInvocation'

const DID_JSON = 'application/did+json'

interface DIDAuthenticator {
  authenticators: VerificationMethod[]
  issuer: string
  didResolutionResult: DIDResolutionResult
}

type LegacyVerificationMethod = { publicKey?: string }

export async function resolveAuthenticator(
  resolver: Resolvable,
  alg: string,
  issuer: string,
  proofPurpose?: ProofPurposeTypes
): Promise<DIDAuthenticator> {
  const types: string[] = SUPPORTED_PUBLIC_KEY_TYPES[alg as KNOWN_JWA]
  if (!types || types.length === 0) {
    throw new Error(`${JWT_ERROR.NOT_SUPPORTED}: No supported signature types for algorithm ${alg}`)
  }
  let didResult: DIDResolutionResult

  const result = (await resolver.resolve(issuer, { accept: DID_JSON })) as unknown
  // support legacy resolvers that do not produce DIDResolutionResult
  if (Object.getOwnPropertyNames(result).indexOf('didDocument') === -1) {
    didResult = {
      didDocument: result as DIDDocument,
      didDocumentMetadata: {},
      didResolutionMetadata: { contentType: DID_JSON },
    }
  } else {
    didResult = result as DIDResolutionResult
  }

  if (didResult.didResolutionMetadata?.error || didResult.didDocument == null) {
    const { error, message } = didResult.didResolutionMetadata
    throw new Error(
      `${JWT_ERROR.RESOLVER_ERROR}: Unable to resolve DID document for ${issuer}: ${error}, ${message || ''}`
    )
  }

  const getPublicKeyById = (verificationMethods: VerificationMethod[], pubid?: string): VerificationMethod | null => {
    const filtered = verificationMethods.filter(({ id }) => pubid === id)
    return filtered.length > 0 ? filtered[0] : null
  }

  let publicKeysToCheck: VerificationMethod[] = [
    ...(didResult?.didDocument?.verificationMethod || []),
    ...(didResult?.didDocument?.publicKey || []),
  ]
  if (typeof proofPurpose === 'string') {
    // support legacy DID Documents that do not list assertionMethod
    if (
      proofPurpose.startsWith('assertion') &&
      !Object.getOwnPropertyNames(didResult?.didDocument).includes('assertionMethod')
    ) {
      didResult.didDocument = { ...(<DIDDocument>didResult.didDocument) }
      didResult.didDocument.assertionMethod = [...publicKeysToCheck.map((pk) => pk.id)]
    }

    publicKeysToCheck = (didResult.didDocument[proofPurpose] || [])
      .map((verificationMethod) => {
        if (typeof verificationMethod === 'string') {
          return getPublicKeyById(publicKeysToCheck, verificationMethod)
        } else if (typeof (<LegacyVerificationMethod>verificationMethod).publicKey === 'string') {
          // this is a legacy format
          return getPublicKeyById(publicKeysToCheck, (<LegacyVerificationMethod>verificationMethod).publicKey)
        } else {
          return <VerificationMethod>verificationMethod
        }
      })
      .filter((key) => key != null) as VerificationMethod[]
  }

  const authenticators: VerificationMethod[] = publicKeysToCheck.filter(({ type }) =>
    types.find((supported) => supported === type)
  )

  if (typeof proofPurpose === 'string' && (!authenticators || authenticators.length === 0)) {
    throw new Error(
      `${JWT_ERROR.NO_SUITABLE_KEYS}: DID document for ${issuer} does not have public keys suitable for ${alg} with ${proofPurpose} purpose`
    )
  }
  if (!authenticators || authenticators.length === 0) {
    throw new Error(`${JWT_ERROR.NO_SUITABLE_KEYS}: DID document for ${issuer} does not have public keys for ${alg}`)
  }
  return { authenticators, issuer, didResolutionResult: didResult }
}
