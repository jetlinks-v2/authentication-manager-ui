import { request } from '@jetlinks-web/core'
import dayjs from 'dayjs'
import { buildOverviewDeviceTerms, queryOverviewIotDeviceSummary, queryOverviewChannelBreakdown } from '../../../../api/overview'
import { countOf } from '../../shared/apiResult'
import { getPrivateOverviewAccess, PRIVATE_TARGETS } from './access'
import { queryPrivateCount, privateWindow } from './query'
import { loadPrivateTrend } from './trends'
import type { PrivateAssetGroup, PrivateBreakdown, PrivateMetric, PrivateResources } from '../types'

/** 配置统计沿用产品发布状态与大屏发布关联条件，未知统计不归为零。 */
async function productMetric(): Promise<PrivateMetric> {
  const row: PrivateMetric = { id: 'product', labelKey: 'privateOverview.products', icon: 'products', unitKey: 'privateOverview.unitItems', target: PRIVATE_TARGETS.product }
  try {
    const [value, enabled, disabled] = await Promise.all([
      queryPrivateCount('/device-product/_count'),
      queryPrivateCount('/device-product/_count', [{ column: 'state', termType: 'eq', value: 1 }]),
      queryPrivateCount('/device-product/_count', [{ column: 'state', termType: 'eq', value: 0 }]),
    ])
    return { ...row, value, statuses: [{ labelKey: 'privateOverview.enabled', value: enabled, tone: 'success' }, { labelKey: 'privateOverview.disabled', value: disabled, tone: 'default' }] }
  } catch { return { ...row, failed: true } }
}

async function screenMetric(): Promise<PrivateMetric> {
  const row: PrivateMetric = { id: 'screen', labelKey: 'privateOverview.screens', icon: 'screen', unitKey: 'privateOverview.unitItems', target: PRIVATE_TARGETS.screen }
  const terms = [{ column: 'projectType', termType: 'eq', value: 'bigScreen' }]
  try {
    const [value, published, draft] = await Promise.all([
      queryPrivateCount('/visualization/project/_query', terms),
      ...['published', 'unpublished'].map(state => queryPrivateCount('/visualization/project/_query', [...terms, {
        column: 'id', termType: 'vis-project-release', value: [{ column: 'state', termType: 'eq', value: state }],
      }])),
    ])
    return { ...row, value, statuses: [{ labelKey: 'privateOverview.published', value: published, tone: 'success' }, { labelKey: 'privateOverview.draft', value: draft, tone: 'default' }] }
  } catch { return { ...row, failed: true } }
}

/** 物联类型与设备列表使用同一产品范围，每个类型同时查询总量和离线量。 */
async function deviceBreakdown(): Promise<PrivateBreakdown[]> {
  return Promise.all(['device', 'gateway', 'childrenDevice'].map(async id => {
    const row = { id, labelKey: `privateOverview.deviceType.${id}` }
    const terms = [...buildOverviewDeviceTerms('iot'), { column: 'deviceType', termType: 'eq', value: id }]
    try {
      const [value, offline] = await Promise.all([
        queryPrivateCount('/device/instance/_count', terms),
        queryPrivateCount('/device/instance/_count', [...terms, { column: 'state', termType: 'not', value: 'online' }]),
      ])
      return { ...row, value, offline }
    } catch { return { ...row, failed: true } }
  }))
}

/** 设备健康与 KPI 共享同一次查询；失败不影响其他已授权资源。 */
async function assetGroup(id: 'iot' | 'video'): Promise<PrivateAssetGroup> {
  const row: PrivateAssetGroup = { id, labelKey: `privateOverview.${id === 'iot' ? 'devices' : 'channels'}`,
    unitKey: `privateOverview.${id === 'iot' ? 'unitDevices' : 'unitChannels'}`,
    target: id === 'iot' ? PRIVATE_TARGETS.devices : PRIVATE_TARGETS.video, breakdown: [] }
  const breakdown = id === 'iot' ? await deviceBreakdown() : []
  try {
    const video = id === 'video' ? await queryOverviewChannelBreakdown('all') : undefined
    const { total, online } = video ? video.reduce((sum, item) => ({ total: sum.total + item.total, online: sum.online + item.online }), { total: 0, online: 0 })
      : await queryOverviewIotDeviceSummary()
    if (video) {
      const knownProviders = ['gb28181-2016', 'onvif', 'agent-media-device-gateway', 'fixed-media']
      for (const provider of knownProviders) {
        breakdown.push({ id: provider, labelKey: `privateOverview.videoProvider.${provider}`, value: video.find(item => item.id === provider)?.total ?? 0 })
      }
      const other = video.filter(item => !knownProviders.includes(item.id)).reduce((sum, item) => sum + item.total, 0)
      if (other > 0) breakdown.push({ id: 'other', labelKey: 'privateOverview.videoProvider.other', value: other })
    }
    if (![total, online].every(value => Number.isFinite(value) && value >= 0) || online > total) throw new Error('Invalid resource summary')
    return { ...row, total, online, offline: total - online, breakdown }
  } catch { return { ...row, breakdown, failed: true } }
}

/** 上报消息沿用资源趋势合计；AI 识别事件按原始历史数量统计，排除复判。 */
async function todayMetric(id: 'message' | 'ai'): Promise<PrivateMetric> {
  const row: PrivateMetric = { id, labelKey: `privateOverview.${id === 'message' ? 'todayMessages' : 'todayEvents'}`,
    icon: id, unitKey: 'privateOverview.unitMessages', target: PRIVATE_TARGETS[id] }
  try {
    if (id === 'message') {
      const trend = await loadPrivateTrend('message', 'today')
      const today = trend.series.find(series => series.id === 'today'), yesterday = trend.series.find(series => series.id === 'yesterday')
      if (!today || !yesterday || today.failed || yesterday.failed) throw new Error('Message count unavailable')
      return { ...row, value: today.total, yesterday: yesterday.total }
    }
    const now = dayjs().valueOf()
    const counts = await Promise.all(['today', 'yesterday'].map(async period => {
      const window = privateWindow(period as 'today' | 'yesterday', now)
      return countOf(await request.post('/ai/task/history/_count', { terms: [
        { column: 'timestamp', termType: 'btw', value: [window.from, window.to] },
        { column: 'taskType', termType: 'not', value: 'reviewHandle' },
      ] }, { hiddenError: true, params: { assetType: 'device' } }))
    }))
    return { ...row, value: counts[0], yesterday: counts[1] }
  } catch { return { ...row, failed: true } }
}

/** 只创建已授权模块请求；有视联时五类 KPI，仅物联时以产品替换视频。 */
export async function loadPrivateResources(): Promise<PrivateResources> {
  const access = getPrivateOverviewAccess()
  const assets = await Promise.all((['iot', 'video'] as const).filter(id => access[id]).map(assetGroup))
  const fromAsset = (asset: PrivateAssetGroup): PrivateMetric => ({
    id: asset.id === 'iot' ? 'devices' : 'video', labelKey: asset.labelKey,
    icon: asset.id === 'iot' ? 'devices' : 'video', unitKey: asset.unitKey, target: asset.target,
    value: asset.total, failed: asset.failed,
    statuses: [{ labelKey: 'privateOverview.online', value: asset.online, tone: 'success' }, { labelKey: 'privateOverview.offline', value: asset.offline, tone: 'error' }],
  })
  const loaders: Array<() => Promise<PrivateMetric>> = []
  if (!access.video && access.product) loaders.push(productMetric)
  assets.forEach(asset => loaders.push(async () => fromAsset(asset)))
  if (access.screen) loaders.push(screenMetric)
  if (access.message) loaders.push(() => todayMetric('message'))
  if (access.ai) loaders.push(() => todayMetric('ai'))
  return { kpis: await Promise.all(loaders.map(load => load())), assets }
}
