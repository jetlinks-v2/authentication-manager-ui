import { loadAlgorithmMetrics } from './apiAlgorithms'
import { request } from '@jetlinks-web/core'
import * as overviewApis from '../../../api/overview'
import { countOf } from './apiResult'
import { RESOURCE_ROWS } from './resources'
import { HOME_TARGETS } from './navigation'
import type { HomeRow } from './types'
interface Summary { total: number; online: number }
interface OverviewApis {
  queryOverviewGatewaySummary: () => Promise<Summary>
  queryOverviewIotDeviceSummary: () => Promise<Summary>
  queryOverviewChannelSummary: () => Promise<Summary>
}
const pageCount = async (path: string, terms: object[] = []) => countOf(await request.post(path, { pageIndex: 0, pageSize: 1, terms }, { hiddenError: true }))
export const loadHealthRows = async (): Promise<HomeRow[]> => {
  const apis: OverviewApis = overviewApis
  const entries = [
    ['gateway', apis.queryOverviewGatewaySummary],
    ['devices', apis.queryOverviewIotDeviceSummary],
    ['video', apis.queryOverviewChannelSummary],
  ] as const
  return Promise.all(entries.map(async ([id, load]) => {
    try {
      if (!load) throw new Error('Missing project overview capability')
      const data = await load()
      if (!Number.isFinite(data.total) || !Number.isFinite(data.online)) throw new Error('Invalid summary')
      return { id, labelKey: id, group: 'health', icon: id, target: HOME_TARGETS[id], value: data.total, online: data.online, offline: Math.max(0, data.total - data.online) }
    } catch { return { id, labelKey: id, group: 'health', icon: id, target: HOME_TARGETS[id], failed: true } }
  }))
}
export const loadResourceRows = async (): Promise<HomeRow[]> => {
  const [health, algorithms] = await Promise.all([loadHealthRows(), loadAlgorithmMetrics().catch(() => undefined)])
  const loaders: Record<string, () => Promise<number>> = {
    collector: async () => countOf(await request.post('/data-collect/collector/_count', {}, { hiddenError: true })),
    card: () => pageCount('/network/card/detail/_query'),
    screen: () => pageCount('/visualization/project/_query', [{ column: 'projectType', termType: 'eq', value: 'bigScreen' }]),
    template: () => pageCount('/visualization/template/_query', [{ column: 'searchCode', termType: 'eq', value: 'visTemplate:visProject:bigScreen' }]),
    ...Object.fromEntries(['image', 'component', 'model'].map(type => [type, () => pageCount('/visualization/resource/latest/_query', [{ column: 'searchCode', termType: 'in', value: `visResource:${type}` }])])),
    agent: () => pageCount('/ai/agent/detail/_query'),
    scene: () => pageCount('/scene/_query'),
  }
  return Promise.all(RESOURCE_ROWS.map(async ({ value: _sample, ...row }) => {
    if (row.id === 'algorithm' || row.id === 'coverage') return { ...row, value: algorithms?.[row.id], failed: algorithms?.[row.id] === undefined }
    const summary = health.find(item => item.id === row.id)
    if (summary) return { ...row, value: summary.value, failed: summary.failed }
    const load = loaders[row.id]
    if (!load) return { ...row, failed: true }
    try { return { ...row, value: await load() } } catch { return { ...row, failed: true } }
  }))
}
export const loadOperationRows = async (): Promise<HomeRow[]> => {
  const health = await loadHealthRows()
  const alarms = await Promise.all([
    ['visionAlarm', 'aiTaskMediaTarget'], ['deviceAlarm', 'device'],
  ].map(async ([id, target]) => {
    try {
      const value = countOf(await request.post(`/alarm/record/${target}/_count`, { terms: [{ column: 'state', value: 'warning' }] }, { hiddenError: true }))
      return { id, labelKey: id, group: 'alarms', value, target: HOME_TARGETS[id] }
    } catch { return { id, labelKey: id, group: 'alarms', failed: true, target: HOME_TARGETS[id] } }
  }))
  return [...health, ...alarms]
}
