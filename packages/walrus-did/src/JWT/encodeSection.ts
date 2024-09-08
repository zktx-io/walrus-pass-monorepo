import canonicalizeData from 'canonicalize'
import { bytesToBase64url } from 'did-jwt'
import { concat, fromString, toString } from 'uint8arrays'

const u8a = { toString, fromString, concat }

export function encodeBase64url(s: string): string {
  return bytesToBase64url(u8a.fromString(s))
}

export function encodeSection(data: any, shouldCanonicalize = false): string {
  if (shouldCanonicalize) {
    return encodeBase64url(<string>canonicalizeData(data))
  } else {
    return encodeBase64url(JSON.stringify(data))
  }
}
