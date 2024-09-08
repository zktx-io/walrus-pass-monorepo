import { base58ToBytes, bytesToBase64url } from 'did-jwt'
import { DIDResolutionResult, DIDResolver } from 'did-resolver'
import { Aggregator } from './configuration'
import { WalrusDIDController } from './WalrusDIDController'

export class WalrusDIDResolver {
  private aggregator: { [key: string]: string } = {}

  constructor(network?: { aggregator: { [key: string]: string } }) {
    this.aggregator = (network && network.aggregator) || Aggregator
  }

  async resolve(did: string): Promise<DIDResolutionResult> {
    const parsedId = did.split(':')
    const fullId = parsedId[parsedId.length - 1].match(/^[1-9A-HJ-NP-Za-km-z]+$/)
    if (!fullId || (parsedId.length !== 3 && parsedId.length !== 4)) {
      return {
        didResolutionMetadata: {
          error: 'invalid did',
          message: `Not a valid did: ${did}`,
        },
        didDocumentMetadata: {},
        didDocument: null,
      }
    }

    const network = parsedId.length === 3 ? 'mainnet' : parsedId[2]
    if (network !== 'mainnet' && network !== 'testnet' && network !== 'devnet') {
      return {
        didResolutionMetadata: {
          error: 'invalid network',
          message: `Not a valid network: ${network}`,
        },
        didDocumentMetadata: {},
        didDocument: null,
      }
    }

    try {
      const blobId = bytesToBase64url(base58ToBytes(parsedId[parsedId.length - 1]))
      const res = await fetch(`${this.aggregator[network]}/${blobId}`)
      const metadata = JSON.parse(await res.text())
      return WalrusDIDController.CreateDoc(did, metadata)
    } catch (error: any) {
      return {
        didResolutionMetadata: {
          error: 'notFound',
          message: error.toString(),
        },
        didDocumentMetadata: {},
        didDocument: null,
      }
    }
  }

  build(): Record<string, DIDResolver> {
    return { walrus: this.resolve.bind(this) }
  }
}
