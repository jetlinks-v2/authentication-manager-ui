export const recordOf = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
export const resultOf = (response: unknown): unknown => {
  const source = recordOf(response)
  if (source.success === false || (typeof source.status === 'number' && source.status >= 400)) throw new Error('Project home query failed')
  return 'result' in source ? source.result : response
}
export const rowsOf = (response: unknown): Record<string, unknown>[] => {
  const result = resultOf(response)
  const rows = Array.isArray(result) ? result : recordOf(result).data
  if (!Array.isArray(rows)) throw new Error('Expected a collection response')
  return rows.map(recordOf)
}
export const countOf = (response: unknown): number => {
  const result = resultOf(response)
  const value = typeof result === 'object' ? recordOf(result).total : result
  if (value === null || value === undefined || value === '') throw new Error('Missing count')
  const count = Number(value)
  if (!Number.isFinite(count) || count < 0) throw new Error('Invalid count')
  return count
}
export const channelCountOf = (response: unknown): number => {
  const result = resultOf(response)
  const source = recordOf(result)
  const value = 'channelCount' in source
    ? source.channelCount
    : ('total' in source ? source.total : result)
  if (value === null || value === undefined || value === '') throw new Error('Missing channel count')
  const count = Number(value)
  if (!Number.isFinite(count) || count < 0) throw new Error('Invalid channel count')
  return count
}
export const textOf = (value: unknown): string => typeof value === 'string' || typeof value === 'number' ? String(value) : ''
