import { base64ToBytes, bytesToBase58 } from 'did-jwt'
import { DIDResolutionResult } from 'did-resolver'
import { Secp256r1Keypair } from '@mysten/sui/keypairs/secp256r1'
import { toB64, fromB64 } from '@mysten/sui/utils'
import { SIGNATURE_FLAG_TO_SCHEME } from '@mysten/sui/cryptography'
import { bcs } from '@mysten/sui/bcs'
import { Network, Publisher } from './configuration'

export class WalrusDIDController {
  private readonly signer: Secp256r1Keypair
  private readonly network: Network
  private publicKey: string

  constructor(network: Network, privateKey: string) {
    this.network = network
    this.signer = Secp256r1Keypair.fromSecretKey(fromB64(privateKey))
    this.publicKey = this.signer.getPublicKey().toBase64()
  }

  private static GetSerializer() {
    const Serializer = bcs.struct('SigData', {
      data: bcs.string(),
      publicKey: bcs.string(),
      signature: bcs.string(),
    })
    return Serializer
  }

  async create(
    payload: { subject: string; publicKey: string; signature: string },
    epochs: number = 1
  ): Promise<DIDResolutionResult> {
    if (this.signer && payload.subject.match(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/)) {
      const Serializer = WalrusDIDController.GetSerializer()
      const data = Serializer.serialize({
        data: payload.subject,
        publicKey: payload.publicKey,
        signature: payload.signature,
      })
      const signature = await this.signer.sign(data.toBytes())
      const created = new Date().toISOString()
      const metaData = {
        created,
        epochs,
        issuer: this.signer.getPublicKey().toBase64(),
        walrus: Serializer.serialize({
          data: data.toBase64(),
          publicKey: this.signer.getPublicKey().toBase64(),
          signature: toB64(signature),
        }).toBase64(),
      }
      const url = Publisher[this.network]
      const res = await fetch(`${url}/store?epochs=${epochs}`, {
        method: 'PUT',
        body: JSON.stringify(metaData),
      })
      if (res.status === 200) {
        const { newlyCreated } = await res.json()
        if (newlyCreated && newlyCreated.blobObject) {
          const identifier = bytesToBase58(base64ToBytes(newlyCreated.blobObject.blobId))
          const did =
            (this.network as any) !== 'mainnet'
              ? `did:walrus:${this.network}:${identifier}`
              : `did:walrus:${identifier}`
          return WalrusDIDController.CreateDoc(did, metaData)
        } else {
          throw new Error('Something went wrong when storing the blob! (2)')
        }
      } else {
        throw new Error('Something went wrong when storing the blob! (1)')
      }
    } else {
      throw new Error('signer error')
    }
  }

  public getPublicKey(): string {
    return this.publicKey
  }

  static CreateDoc(did: string, metaData: any): DIDResolutionResult {
    const Serializer = WalrusDIDController.GetSerializer()
    const publicKey = fromB64(Serializer.fromBase64(Serializer.fromBase64(metaData.walrus).data).publicKey)
    const signatureScheme = SIGNATURE_FLAG_TO_SCHEME[publicKey[0] as keyof typeof SIGNATURE_FLAG_TO_SCHEME]
    const type = signatureScheme === 'Secp256r1' ? 'EcdsaSecp256r1VerificationKey2019' : 'zkLoginSignatureVerification'
    return {
      didDocumentMetadata: { ...metaData },
      didResolutionMetadata: { contentType: 'application/did+ld+json' },
      didDocument: {
        '@context': ['https://www.w3.org/ns/did/v1'],
        id: did,
        verificationMethod: [
          {
            id: `${did}#keys-1`,
            controller: `${did}`,
            type,
            publicKeyBase64: toB64(publicKey.slice(1)),
          },
        ],
        authentication: [],
        assertionMethod: [],
      },
    }
  }
}
