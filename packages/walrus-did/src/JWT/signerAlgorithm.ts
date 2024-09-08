import { Signer } from 'did-jwt'
import { EcdsaSignature, SignerAlgorithm } from './type'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function instanceOfEcdsaSignature(object: any): object is EcdsaSignature {
  return typeof object === 'object' && 'r' in object && 's' in object
}

export function ZkLoginSignerAlg(): SignerAlgorithm {
  return async function sign(payload: string, signer: Signer): Promise<string> {
    const signature: EcdsaSignature | string = await signer(payload)
    if (!instanceOfEcdsaSignature(signature)) {
      return signature
    } else {
      throw new Error('invalid_config: expected a signer function that returns a string instead of signature object')
    }
  }
}

interface SignerAlgorithms {
  [alg: string]: SignerAlgorithm
}

const algorithms: SignerAlgorithms = {
  zkLogin: ZkLoginSignerAlg(),
}

function SignerAlg(alg: string): SignerAlgorithm {
  const impl: SignerAlgorithm = algorithms[alg]
  if (!impl) throw new Error(`not_supported: Unsupported algorithm ${alg}`)
  return impl
}

export default SignerAlg
