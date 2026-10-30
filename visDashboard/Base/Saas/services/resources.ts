import { request } from '@jetlinks-web/core'
import {
  queryOverviewGatewaySummary, queryOverviewIotDeviceSummary, queryOverviewChannelSummary,
  type OverviewCountSummary,
} from '../../../../api/overview'
import { countOf } from '../../shared/apiResult'
import type { HomeRow, HomeTarget } from '../../shared/types'
import { getSaasOverviewAccess, SAAS_RESOURCE_TARGETS, type SaasResourceId } from './access'

interface QueryTerm { column: string; termType?: string; value: unknown }
type ResourceValue = Pick<HomeRow, 'value' | 'statuses'>
interface ResourceDefinition {
  id: SaasResourceId
  labelKey: string
  icon: string
  target?: HomeTarget
  load: () => Promise<ResourceValue>
}

/** 以分页总量查询现有业务列表，避免为概览下载全部实体。 */
const queryCount = async (path: string, terms: QueryTerm[] = []): Promise<number> => countOf(
  await request.post(path, { pageIndex: 0, pageSize: 1, terms }, { hiddenError: true }),
)

/** 设备三类指标沿用统一资源页口径；断连、加载失败由 owning API 判定。 */
async function loadHealth(load: () => Promise<OverviewCountSummary>): Promise<ResourceValue> {
  const { total, online } = await load()
  if (![total, online].every(value => Number.isFinite(value) && value >= 0) || online > total) {
    throw new Error('Invalid resource health summary')
  }
  return { value: total, statuses: [
    { labelKey: 'saasOnline', value: online, tone: 'success' },
    { labelKey: 'saasOffline', value: total - online, tone: 'error' },
  ] }
}

/** 总数包含全部大屏；概览仅展示发布与草稿状态，不单列已过期数量。 */
async function loadScreens(): Promise<ResourceValue> {
  const base = [{ column: 'projectType', termType: 'eq', value: 'bigScreen' }]
  const states = ['published', 'unpublished']
  const [value, ...counts] = await Promise.all([
    queryCount('/visualization/project/_query', base),
    ...states.map(state => queryCount('/visualization/project/_query', [...base, {
      column: 'id', termType: 'vis-project-release', value: [{ column: 'state', termType: 'eq', value: state }],
    }])),
  ])
  return { value, statuses: [
    { labelKey: 'saasPublished', value: counts[0], tone: 'success' },
    { labelKey: 'saasDraft', value: counts[1], tone: 'default' },
  ] }
}

/** 资源逐项隔离失败，并在创建请求前应用实际菜单和模块权限。 */
export async function loadSaasResourceRows(): Promise<HomeRow[]> {
  const access = getSaasOverviewAccess()
  const targets = SAAS_RESOURCE_TARGETS
  const definitions: ResourceDefinition[] = [
    { id: 'devices', labelKey: 'saasResourceDevices', icon: 'devices', target: targets.devices, load: () => loadHealth(queryOverviewIotDeviceSummary) },
    { id: 'video', labelKey: 'saasVideo', icon: 'video', target: targets.video, load: () => loadHealth(queryOverviewChannelSummary) },
    { id: 'gateway', labelKey: 'saasGateway', icon: 'gateway', target: targets.gateway, load: () => loadHealth(queryOverviewGatewaySummary) },
    { id: 'screen', labelKey: 'saasDataBoard', icon: 'screen', target: targets.screen, load: loadScreens },
  ]
  return Promise.all(definitions.filter(item => access.resourceIds.includes(item.id))
    .map(async ({ load, ...row }) => {
      const unitKey = row.id === 'video' ? 'saasUnitChannels'
        : row.id === 'screen' ? 'saasUnitScreens' : 'saasUnitDevices'
      try { return { ...row, unitKey, ...await load() } }
      catch { return { ...row, unitKey, failed: true } }
    }))
}
