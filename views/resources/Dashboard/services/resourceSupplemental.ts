import dayjs from 'dayjs'
import { request } from '@jetlinks-web/core'
import { buildOverviewDeviceTerms } from '../../../../api/overview'
import { countOf, recordOf, resultOf, rowsOf, textOf } from '../../../../visDashboard/Base/shared/apiResult'
import { numberOf, rangeOf } from '../../../../visDashboard/ResourceCenter/services/trends'
import {
  emptySupplementalData,
  type ResourceSupplementalData,
  type ResourceSupplementalKind,
  type ResourceSupplementalRange,
  type ResourceSupplementalRow,
} from '../resourceSupplemental.types'

type JsonRecord = Record<string, unknown>
const configOf = (signal?: AbortSignal) => ({ hiddenError: true, signal })

/** Month-to-date is a calendar month; other windows share the resource message trend contract. */
export function supplementalRange(range: ResourceSupplementalRange, now = dayjs()) {
  if (range === 'month') return {
    from: now.startOf('month').valueOf(), to: now.valueOf(), time: '1d', format: 'yyyy-MM-dd', limit: now.date(),
  }
  return rangeOf(range, now)
}

/** Query the historical online percentage directly; never derive a device count from this rate. */
async function loadTrend(kind: 'online' | 'traffic', range: ResourceSupplementalRange, signal?: AbortSignal) {
  const params = supplementalRange(range)
  const measurement = kind === 'online'
    ? { dashboard: 'device', object: 'status', measurement: 'record', dimension: 'onlineRate' }
    : { dashboard: 'flow', object: 'networkCardFlow', measurement: 'trend', dimension: 'agg' }
  const rows = rowsOf(await request.post('/dashboard/_multi', [{
    ...measurement, group: `resource-${kind}`, params,
  }], configOf(signal)))
  const series = rows.map(row => {
    const data = recordOf(row.data)
    const time = textOf(data.timeString)
    if (!time) throw new Error('Missing trend time')
    return { time, value: numberOf(data.value) }
  }).sort((a, b) => a.time.localeCompare(b.time))
  return { ...emptySupplementalData(), series, total: kind === 'traffic' ? series.reduce((sum, item) => sum + item.value, 0) : 0 }
}

/** Page through all authorized rows; a presentation limit must not change the underlying population. */
async function queryPages(path: string, query: JsonRecord, signal?: AbortSignal): Promise<JsonRecord[]> {
  const data: JsonRecord[] = []
  const pageSize = 200
  for (let pageIndex = 0; ; pageIndex += 1) {
    if (signal?.aborted) throw new Error('Resource request cancelled')
    const response = await request.post(path, { ...query, pageIndex, pageSize }, configOf(signal))
    const page = rowsOf(response)
    const result = resultOf(response)
    data.push(...page)
    const total = Number(recordOf(result).total)
    if (Array.isArray(result) || !page.length || (Number.isFinite(total) && data.length >= total) || page.length < pageSize) return data
  }
}

/** Pool units are MB, as displayed by the owning pool management page; names are not operator identities. */
async function loadPools(signal?: AbortSignal): Promise<ResourceSupplementalData> {
  const rows = await queryPages('/network/card/pool/query/_detail', {
    sorts: [{ name: 'createTime', order: 'desc' }],
  }, signal)
  const pools = rows.map(row => ({
    id: textOf(row.id), name: textOf(row.alias) || textOf(row.name) || textOf(row.id),
    used: numberOf(row.usedFlow), total: numberOf(row.totalFlow), cards: numberOf(row.cardTotal),
  }))
  return { ...emptySupplementalData(), pools, total: pools.length }
}

/** Use the backend running-state dictionary, including stopped and future states, without relabelling them as errors. */
async function loadPoints(signal?: AbortSignal): Promise<ResourceSupplementalData> {
  const [states, total]: [JsonRecord[], number] = await Promise.all([
    request.get('/dictionary/running-state/items', {}, configOf(signal)).then(rowsOf),
    request.post('/data-collect/point/_count', {}, configOf(signal)).then(countOf),
  ])
  if (!states.length) throw new Error('Missing collection running states')
  const rows = await Promise.all(states.map(async (state): Promise<ResourceSupplementalRow> => {
    const id = textOf(state.value)
    if (!id) throw new Error('Missing collection state')
    const value = countOf(await request.post('/data-collect/point/_count', {
      terms: [{ column: 'runningState', termType: 'eq', value: id }],
    }, configOf(signal)))
    return { id, name: textOf(state.text) || id, value,
      tone: id === 'running' ? 'success' : id === 'error' ? 'error' : 'default' }
  }))
  return { ...emptySupplementalData(), rows, total }
}

/** Count stored channel provider IDs and resolve their display names through the owning module's provider registry. */
async function loadProtocols(signal?: AbortSignal): Promise<ResourceSupplementalData> {
  const [channels, providers]: [JsonRecord[], JsonRecord[]] = await Promise.all([
    request.post('/data-collect/channel/_query/no-paging', { paging: false }, configOf(signal)).then(rowsOf),
    request.get('/data-collect/channel/providers', {}, configOf(signal)).then(rowsOf),
  ])
  const names = new Map(providers.map(row => [textOf(row.id), textOf(row.name)]))
  const counts = new Map<string, number>()
  for (const channel of channels) {
    const provider = textOf(recordOf(channel.provider).value) || textOf(channel.provider)
    if (!provider) throw new Error('Missing channel provider')
    counts.set(provider, (counts.get(provider) || 0) + 1)
  }
  const rows = [...counts].map(([id, value]) => ({ id, name: names.get(id) || id, value, tone: 'primary' as const }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
  return { ...emptySupplementalData(), rows, total: channels.length }
}

/** Offline time is enriched on DeviceDetail, not a sortable entity column: rank the complete authorized offline set locally. */
async function loadOffline(signal?: AbortSignal): Promise<ResourceSupplementalData> {
  const rows = await queryPages('/device/instance/detail/_query', {
    sorts: [{ name: 'id', order: 'asc' }],
    terms: [...buildOverviewDeviceTerms('iot'), { column: 'state', termType: 'eq', value: 'offline' }],
    context: { includeTags: false, includeRelations: false, includeBind: false, includeFirmwareInfos: false, includeParent: false },
  }, signal)
  const devices = rows.flatMap(row => {
    const offlineTime = Number(row.offlineTime)
    const id = textOf(row.id)
    if (!id || !Number.isFinite(offlineTime) || offlineTime <= 0) return []
    const extension = recordOf(row.extensions)
    const iot = recordOf(extension.iot)
    const location = textOf(iot.area) || textOf(extension.area) || textOf(row.address) || textOf(row.orgName)
    return [{ id, name: textOf(row.name) || id, offlineTime,
      description: [textOf(row.productName), location].filter(Boolean).join(' · ') }]
  }).sort((a, b) => b.offlineTime - a.offlineTime).slice(0, 7)
  return { ...emptySupplementalData(), devices, total: rows.length }
}

/** Read-only supplemental loaders retain independent empty and error states for each capability. */
export function loadResourceSupplemental(kind: ResourceSupplementalKind, range: ResourceSupplementalRange, signal?: AbortSignal) {
  if (kind === 'online' || kind === 'traffic') return loadTrend(kind, range, signal)
  if (kind === 'pools') return loadPools(signal)
  if (kind === 'points') return loadPoints(signal)
  if (kind === 'protocols') return loadProtocols(signal)
  return loadOffline(signal)
}
