import { JWTHeader, JWTOptions, JWTPayload, JWTVerified, JWTVerifyOptions, JWT_ERROR, Signer, decodeJWT } from 'did-jwt'
import { DIDResolutionResult, parse, ParsedDID, VerificationMethod } from 'did-resolver'
import { NBF_SKEW } from './type'
import { ProofPurposeTypes, resolveAuthenticator } from './resolveAuthenticator'
import { verifyProof } from './conditionalAlgorithm'
import { createJWS } from './createJWS'

export async function createZkLoginJWT(
  payload: Partial<JWTPayload>,
  { issuer, signer, alg, expiresIn, canonicalize }: JWTOptions,
  header: Partial<JWTHeader> = {}
): Promise<string> {
  if (!signer) throw new Error('missing_signer: No Signer functionality has been configured')
  if (!issuer) throw new Error('missing_issuer: No issuing DID has been configured')
  if (!header.typ) header.typ = 'JWT'
  if (!header.alg) header.alg = alg
  const timestamps: Partial<JWTPayload> = {
    iat: Math.floor(Date.now() / 1000),
    exp: undefined,
  }
  if (expiresIn) {
    if (typeof expiresIn === 'number') {
      timestamps.exp = <number>(payload.nbf || timestamps.iat) + Math.floor(expiresIn)
    } else {
      throw new Error('invalid_argument: JWT expiresIn is not a number')
    }
  }
  const fullPayload = { ...timestamps, ...payload, iss: issuer }
  return createJWS(fullPayload, signer, header, { canonicalize })
}

export const verifyZkLoginJWT = async (jwt: string, options: JWTVerifyOptions): Promise<JWTVerified> => {
  if (!options.resolver) throw new Error('missing_resolver: No DID resolver has been configured')
  const { payload, header, signature, data } = decodeJWT(jwt, false)

  const proofPurpose: ProofPurposeTypes | undefined = Object.prototype.hasOwnProperty.call(options, 'auth')
    ? options.auth
      ? 'authentication'
      : undefined
    : options.proofPurpose

  let didUrl: string | undefined

  if (!payload.iss && !payload.client_id) {
    throw new Error(`${JWT_ERROR.INVALID_JWT}: JWT iss or client_id are required`)
  }

  if (options.didAuthenticator) {
    didUrl = options.didAuthenticator.issuer
  } else if (!payload.iss && payload.scope === 'openid' && payload.redirect_uri) {
    // SIOP Request payload
    // https://identity.foundation/jwt-vc-presentation-profile/#self-issued-op-request-object
    if (!payload.client_id) {
      throw new Error(`${JWT_ERROR.INVALID_JWT}: JWT client_id is required`)
    }
    didUrl = payload.client_id
  } else {
    didUrl = payload.iss
  }

  if (!didUrl) {
    throw new Error(`${JWT_ERROR.INVALID_JWT}: No DID has been found in the JWT`)
  }

  let authenticators: VerificationMethod[]
  let issuer: string
  let didResolutionResult: DIDResolutionResult
  if (options.didAuthenticator) {
    ;({ didResolutionResult, authenticators, issuer } = options.didAuthenticator)
  } else {
    ;({ didResolutionResult, authenticators, issuer } = await resolveAuthenticator(
      options.resolver,
      header.alg,
      didUrl,
      proofPurpose
    ))
    // Add to options object for recursive reference
    options.didAuthenticator = { didResolutionResult, authenticators, issuer }
  }

  const { did } = parse(didUrl) as ParsedDID

  let signer: VerificationMethod | null = null

  if (did !== didUrl) {
    const authenticator = authenticators.find((auth) => auth.id === didUrl)
    if (!authenticator) {
      throw new Error(`${JWT_ERROR.INVALID_JWT}: No authenticator found for did URL ${didUrl}`)
    }

    signer = await verifyProof(jwt, { payload, header, signature, data }, authenticator, options)
  } else {
    let i = 0
    while (!signer && i < authenticators.length) {
      const authenticator = authenticators[i]
      try {
        signer = await verifyProof(jwt, { payload, header, signature, data }, authenticator, options)
      } catch (e) {
        if (!(e as Error).message.includes(JWT_ERROR.INVALID_SIGNATURE) || i === authenticators.length - 1) throw e
      }

      i++
    }
  }

  if (signer) {
    const now: number = typeof options.policies?.now === 'number' ? options.policies.now : Math.floor(Date.now() / 1000)
    const skewTime = typeof options.skewTime !== 'undefined' && options.skewTime >= 0 ? options.skewTime : NBF_SKEW

    const nowSkewed = now + skewTime
    if (options.policies?.nbf !== false && payload.nbf) {
      if (payload.nbf > nowSkewed) {
        throw new Error(`${JWT_ERROR.INVALID_JWT}: JWT not valid before nbf: ${payload.nbf}`)
      }
    } else if (options.policies?.iat !== false && payload.iat && payload.iat > nowSkewed) {
      throw new Error(`${JWT_ERROR.INVALID_JWT}: JWT not valid yet (issued in the future) iat: ${payload.iat}`)
    }
    if (options.policies?.exp !== false && payload.exp && payload.exp <= now - skewTime) {
      throw new Error(`${JWT_ERROR.INVALID_JWT}: JWT has expired: exp: ${payload.exp} < now: ${now}`)
    }
    if (options.policies?.aud !== false && payload.aud) {
      if (!options.audience && !options.callbackUrl) {
        throw new Error(
          `${JWT_ERROR.INVALID_AUDIENCE}: JWT audience is required but your app address has not been configured`
        )
      }
      const audArray = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
      const matchedAudience = audArray.find((item) => options.audience === item || options.callbackUrl === item)

      if (typeof matchedAudience === 'undefined') {
        throw new Error(`${JWT_ERROR.INVALID_AUDIENCE}: JWT audience does not match your DID or callback url`)
      }
    }

    return { verified: true, payload, didResolutionResult, issuer, signer, jwt, policies: options.policies }
  }
  throw new Error(
    `${JWT_ERROR.INVALID_SIGNATURE}: JWT not valid. issuer DID document does not contain a verificationMethod that matches the signature.`
  )
}
