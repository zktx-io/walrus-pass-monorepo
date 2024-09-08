import {
  createJWT,
  JWTVerified,
  Signer as JWTSigner,
  verifyJWT,
  JWTPayload,
  decodeJWT,
  bytesToBase64url,
  base64ToBytes,
} from 'did-jwt'
import { Resolvable } from 'did-resolver'
import { sha256 as sha256Hash } from '@noble/hashes/sha256'
import { toZkLoginPublicIdentifier, ZkLoginPublicIdentifier } from '@mysten/sui/zklogin'
import { Secp256r1Keypair, Secp256r1PublicKey } from '@mysten/sui/keypairs/secp256r1'
import { fromB64, toB64 } from '@mysten/sui/utils'
import { getZkLoginSignature } from '@mysten/zklogin'
import { bcs } from '@mysten/sui/bcs'
import { SIGNATURE_FLAG_TO_SCHEME } from '@mysten/sui/cryptography'
import { SuiGraphQLClient } from '@mysten/sui/graphql'
import { createZkLoginJWT, verifyZkLoginJWT } from './JWT'

export class WalrusDID {
  private readonly alg: string
  private readonly signer?: JWTSigner
  private readonly publicKey: string

  constructor(signer: {
    privateKey: string
    zkLogin?: {
      addressSeed: string
      iss: string
      proof: string
      maxEpoch: number
    }
  }) {
    this.alg = signer.zkLogin ? 'zkLogin' : 'ES256'
    this.publicKey = signer.zkLogin
      ? toZkLoginPublicIdentifier(BigInt(signer.zkLogin.addressSeed), signer.zkLogin.iss).toSuiPublicKey()
      : Secp256r1Keypair.fromSecretKey(fromB64(signer.privateKey)).getPublicKey().toSuiPublicKey()
    this.signer = signer.zkLogin
      ? async (data: string | Uint8Array): Promise<string> => {
          const { signature } = await Secp256r1Keypair.fromSecretKey(fromB64(signer.privateKey)).signPersonalMessage(
            sha256Hash(typeof data === 'string' ? new TextEncoder().encode(data) : data)
          )
          const zkLoginSignature = getZkLoginSignature({
            inputs: {
              ...JSON.parse(signer.zkLogin!.proof),
              addressSeed: signer.zkLogin?.addressSeed,
            },
            maxEpoch: signer.zkLogin!.maxEpoch,
            userSignature: signature,
          })
          return bytesToBase64url(fromB64(zkLoginSignature))
        }
      : async (data: string | Uint8Array): Promise<string> => {
          const userSignature = await Secp256r1Keypair.fromSecretKey(fromB64(signer.privateKey)).sign(
            typeof data === 'string' ? new TextEncoder().encode(data) : data
          )
          return bytesToBase64url(userSignature)
        }
  }

  public getPublicKey(): string {
    return this.publicKey
  }

  async sign(data: string | Uint8Array): Promise<string> {
    if (this.signer) {
      return this.signer(data) as Promise<string>
    }
    throw new Error('signer error')
  }

  async signJWT(did: string, payload: Partial<JWTPayload>, expiresIn?: number): Promise<string> {
    if (this.signer) {
      const options = {
        signer: this.signer,
        alg: this.alg,
        issuer: did,
      }
      if (expiresIn) (<any>options)['expiresIn'] = expiresIn
      if (this.alg === 'zkLogin') {
        return createZkLoginJWT(payload, options)
      }
      return createJWT(payload, options)
    }
    throw new Error('signer error')
  }

  async verifyJWT(jwt: string, resolver: Resolvable, audience: string): Promise<JWTVerified> {
    const decoded = decodeJWT(jwt)
    if (decoded.header.alg === 'zkLogin') {
      return verifyZkLoginJWT(jwt, { resolver, audience })
    }
    return verifyJWT(jwt, { resolver, audience })
  }

  static async VerifyMetaData(verified: JWTVerified, issuer?: string): Promise<boolean> {
    try {
      const { walrus } = verified.didResolutionResult.didDocumentMetadata
      const Serializer = bcs.struct('SigData', {
        data: bcs.string(),
        publicKey: bcs.string(),
        signature: bcs.string(),
      })
      const parsed = Serializer.fromBase64(walrus)
      const { data, publicKey, signature } = Serializer.fromBase64(parsed.data)
      const signatureScheme = SIGNATURE_FLAG_TO_SCHEME[fromB64(publicKey)[0] as keyof typeof SIGNATURE_FLAG_TO_SCHEME]

      if (issuer) {
        const pubKey = new Secp256r1PublicKey(fromB64(issuer))
        const verify = await pubKey.verify(fromB64(parsed.data), fromB64(parsed.signature))
        if (!verify || issuer !== parsed.publicKey) {
          return false
        }
      }

      if (signatureScheme === 'Secp256r1') {
        const pubKey = new Secp256r1PublicKey(fromB64(publicKey).slice(1))
        return (
          toB64(fromB64(publicKey).slice(1)) === verified.signer.publicKeyBase64 &&
          (await pubKey.verify(fromB64(data), fromB64(signature)))
        )
      } else if (signatureScheme === 'ZkLogin') {
        const parsed = verified.issuer.split(':')
        const network = parsed.length === 3 ? 'mainnet' : parsed[2]
        const client = new SuiGraphQLClient({
          url: `https://sui-${network}.mystenlabs.com/graphql`,
        })
        const zkLoginPublicIdentifier = new ZkLoginPublicIdentifier(fromB64(publicKey), { client })
        const bytes = base64ToBytes(signature)
        const verifySubject = await zkLoginPublicIdentifier.verifyPersonalMessage(sha256Hash(fromB64(data)), bytes)
        const split = verified.jwt.split('.')
        const verifyJwt = await zkLoginPublicIdentifier.verifyPersonalMessage(
          sha256Hash(new TextEncoder().encode(`${split[0]}.${split[1]}`)),
          base64ToBytes(split[2])
        )
        return verifySubject && verifyJwt
      }
      return false
    } catch (error) {
      return false
    }
  }
}
