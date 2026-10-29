export type SignatureCheckName = 'version' | 'application' | 'platform' | 'key' | 'timestamp' | 'signature'
export interface SignatureCheck { name: SignatureCheckName; valid: boolean }
export interface CallbackVerification {
  checks: SignatureCheck[]
  valid: boolean
  bodyHash: string
  expectedSignature: string
  receivedSignature: string
}

const signatureHeaders = [
  'x-signature-version', 'x-application-id', 'x-platform-id', 'x-key-id', 'x-timestamp', 'x-event-id',
]

export const parseCallbackHeaders = (text: string): Record<string, string> => {
  const headers: Record<string, string> = Object.create(null)
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    const separator = line.indexOf(':')
    const name = line.slice(0, separator).trim().toLowerCase()
    if (separator <= 0 || !/^[!#$%&'*+.^_`|~\w-]+$/.test(name) || Object.hasOwn(headers, name)) {
      throw new Error('ThirdPartyApplication.debug.invalidHeaders')
    }
    headers[name] = line.slice(separator + 1).trim()
  }
  if ([...signatureHeaders.filter(name => name !== 'x-platform-id'), 'x-signature'].some(name => !headers[name])) {
    throw new Error('ThirdPartyApplication.debug.missingHeaders')
  }
  return headers
}

/** 严格对应 HttpSignatureUtils：UTF-8 字节长度的四字节大端前缀，空平台域仍保留。 */
const canonicalBytes = (fields: string[]): Uint8Array<ArrayBuffer> => {
  const encoder = new TextEncoder()
  const values = fields.map(field => encoder.encode(field))
  const bytes = new Uint8Array(values.reduce((size, value) => size + 4 + value.length, 0))
  const view = new DataView(bytes.buffer)
  let offset = 0
  for (const value of values) {
    view.setUint32(offset, value.length, false)
    bytes.set(value, offset + 4)
    offset += 4 + value.length
  }
  return bytes
}

const signCallbackBody = async (headers: Record<string, string>, body: Uint8Array<ArrayBuffer>, secret: string) => {
  if (!globalThis.crypto?.subtle) throw new Error('ThirdPartyApplication.debug.cryptoUnavailable')
  const fields = signatureHeaders.map(name => headers[name] || '')
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', body))
  const bodyHash = [...digest].map(value => value.toString(16).padStart(2, '0')).join('')
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
  const canonical = canonicalBytes([...fields, bodyHash])
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, canonical))
  const expectedSignature = btoa(String.fromCharCode(...signature)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return { key, canonical, bodyHash, expectedSignature }
}

export const callbackSampleIdentity = {
  applicationId: 'local-debug-application', clientId: 'local-debug-client', secret: 'local-debug-secret-not-for-production',
}

export const createCallbackSample = async (message: string) => {
  if (!globalThis.crypto?.subtle) throw new Error('ThirdPartyApplication.debug.cryptoUnavailable')
  const timestamp = Date.now()
  const eventId = crypto.randomUUID()
  const body = JSON.stringify({ id: eventId, type: 'debug.example', timestamp, data: { message } }, null, 2)
  const headers: Record<string, string> = {
    'X-Signature-Version': '1', 'X-Application-Id': callbackSampleIdentity.applicationId, 'X-Platform-Id': '',
    'X-Key-Id': callbackSampleIdentity.clientId, 'X-Timestamp': String(timestamp), 'X-Event-Id': eventId,
  }
  const normalized = Object.fromEntries(Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]))
  const signature = await signCallbackBody(normalized, new TextEncoder().encode(body), callbackSampleIdentity.secret)
  headers['X-Signature'] = signature.expectedSignature
  return { headers, body, windowSeconds: 300 }
}

export const verifyCallbackSignature = async (input: {
  applicationId: string; clientId: string; secret: string; headers: string; body: Uint8Array<ArrayBuffer>; maxSkewMs: number
}): Promise<CallbackVerification> => {
  if (!Number.isSafeInteger(input.maxSkewMs) || input.maxSkewMs <= 0) throw new Error('ThirdPartyApplication.debug.windowRequired')
  const headers = parseCallbackHeaders(input.headers)
  const { key, canonical, bodyHash, expectedSignature } = await signCallbackBody(headers, input.body, input.secret)
  const receivedSignature = headers['x-signature']
  let signatureValid = false
  if (/^[A-Za-z0-9_-]{43}$/.test(receivedSignature)) {
    const received = Uint8Array.from(atob(receivedSignature.replace(/-/g, '+').replace(/_/g, '/') + '='), value => value.charCodeAt(0))
    const encoded = btoa(String.fromCharCode(...received)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    signatureValid = encoded === receivedSignature && await crypto.subtle.verify('HMAC', key, received, canonical)
  }
  const timestamp = Number(headers['x-timestamp'])
  const checks: SignatureCheck[] = [
    { name: 'version', valid: headers['x-signature-version'] === '1' },
    { name: 'application', valid: headers['x-application-id'] === input.applicationId },
    { name: 'platform', valid: !headers['x-platform-id'] },
    { name: 'key', valid: headers['x-key-id'] === input.clientId },
    { name: 'timestamp', valid: /^\d+$/.test(headers['x-timestamp']) && Number.isSafeInteger(timestamp) && Math.abs(Date.now() - timestamp) <= input.maxSkewMs },
    { name: 'signature', valid: signatureValid },
  ]
  return { checks, valid: checks.every(check => check.valid), bodyHash, expectedSignature, receivedSignature }
}
