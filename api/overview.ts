import globalI18n from '@jetlinks-web-core/locales'
import { request } from '@jetlinks-web/core'

type JsonRecord = Record<string, unknown>

type DeviceDetailTerm = {
  column: string
  termType?: string
  value: unknown
}

export type OverviewDeviceTerm = DeviceDetailTerm

export interface OverviewCountSummary {
  total: number
  online: number
}

export interface OverviewGatewayItem {
  id: string
  name: string
  productId?: string
  productName?: string
  connectionStatus: 'online' | 'offline' | 'disabled'
  connectionStatusText?: string
  online: boolean
}

export interface OverviewGatewayPage {
  data: OverviewGatewayItem[]
  total: number
}

const GATEWAY_ACCESS_PROVIDERS = [
  'agent-device-gateway',
  'agent-media-device-gateway',
] as const

// 与视频模块公开的统一设备分类一致；媒体网关本身仍属于边缘节点。
const VIDEO_DEVICE_ACCESS_PROVIDERS = ['fixed-media', 'gb28181-2016', 'media-plugin', 'onvif'] as const

const NON_IOT_ACCESS_PROVIDERS = [
  ...GATEWAY_ACCESS_PROVIDERS,
  'official-edge-gateway',
  ...VIDEO_DEVICE_ACCESS_PROVIDERS,
] as const

const MEDIA_ACCESS_PROVIDERS = new Set([
  'agent-media-device-gateway',
  'fixed-media',
  'gb28181-2016',
  'onvif',
])

const ONLINE_STATES = new Set(['online', 'connected', 'success'])
const DEGRADED_STATES = new Set(['degraded', 'warn', 'warning', 'error', 'failed'])
const MEDIA_PAGE_SIZE = 200

const DETAIL_CONTEXT = {
  includeTags: false,
  includeRelations: false,
  includeBind: false,
  includeFirmwareInfos: false,
  includeParent: false,
}

const recordOf = (value: unknown): JsonRecord => (
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : {}
)

const unwrapResult = (response: unknown): unknown => {
  const responseRecord = recordOf(response)
  if ('result' in responseRecord) return responseRecord.result

  const dataRecord = recordOf(responseRecord.data)
  if ('result' in dataRecord) return dataRecord.result
  return response
}

const countOf = (response: unknown): number => {
  const result = unwrapResult(response)
  const resultRecord = recordOf(result)
  const value = Object.keys(resultRecord).length
    ? resultRecord.total ?? resultRecord.count
    : result
  const count = Number(value)
  if (!Number.isFinite(count) || count < 0) throw new Error('Invalid overview count')
  return count
}

const enumValueOf = (value: unknown): string => {
  const valueRecord = recordOf(value)
  const raw = valueRecord.value ?? valueRecord.text ?? value
  return typeof raw === 'string' || typeof raw === 'number'
    ? String(raw).trim().toLowerCase()
    : ''
}

const textOf = (...values: unknown[]): string => {
  const value = values.find(item => item !== undefined && item !== null && String(item).trim())
  return value === undefined ? '' : String(value).trim()
}

const buildDetailQuery = (terms: DeviceDetailTerm[], pageSize = 12) => ({
  pageIndex: 0,
  pageSize,
  sorts: [{ name: 'createTime', order: 'desc' }],
  terms,
  context: DETAIL_CONTEXT,
})

// 与统一设备列表保持同一边缘节点口径：只按边端接入方式筛选，不追加产品物模型类型条件。
const buildGatewayTerms = (): DeviceDetailTerm[] => [
  {
    column: 'productId$product-info',
    value: `accessProvider in (${GATEWAY_ACCESS_PROVIDERS.join(',')})`,
  },
]

const buildIotDeviceTerms = (): DeviceDetailTerm[] => [
  {
    column: 'productId$product-info',
    value: `accessProvider nin (${NON_IOT_ACCESS_PROVIDERS.join(',')})`,
  },
]

const isAgentDisconnected = (error: unknown): boolean => {
  const errorRecord = recordOf(error)
  const responseData = recordOf(recordOf(errorRecord.response).data)
  const code = textOf(errorRecord.code, responseData.code)
  const message = textOf(errorRecord.message, responseData.message)
  return code === 'error.agent_client_is_disconnected' || message.includes('边缘节点连接已断开')
}

const queryDeviceDetailCount = async (terms: DeviceDetailTerm[], signal?: AbortSignal): Promise<number> => {
  const response = await request.post(
    '/device/instance/_count',
    buildDetailQuery(terms),
    { hiddenError: true, signal },
  )
  return countOf(response)
}

const rowsOfPage = (response: unknown): { rows: JsonRecord[]; total: number } => {
  const result = unwrapResult(response)
  if (Array.isArray(result)) {
    return { rows: result.map(recordOf), total: result.length }
  }

  const page = recordOf(result)
  if (!Array.isArray(page.data)) throw new Error('Invalid media query result')
  const rows = page.data.map(recordOf)
  const total = Number(page.total)
  return {
    rows,
    total: Number.isFinite(total) && total >= 0 ? total : rows.length,
  }
}

const queryAllPages = async (
  path: string,
  query: JsonRecord,
  signal?: AbortSignal,
): Promise<JsonRecord[]> => {
  const rows: JsonRecord[] = []
  let pageIndex = Number(query.pageIndex ?? 0)
  let total = Number.POSITIVE_INFINITY

  while (rows.length < total) {
    const response = await request.post(
      path,
      { ...query, pageIndex, pageSize: MEDIA_PAGE_SIZE },
      { hiddenError: true, signal },
    )
    if (response.success === false || response.status >= 400) throw new Error('Media query failed')
    const page = rowsOfPage(response)
    rows.push(...page.rows)
    total = page.total
    if (!page.rows.length || rows.length >= total || page.rows.length < MEDIA_PAGE_SIZE) break
    pageIndex += 1
  }

  return rows
}

type MediaGatewayConnection = 'online' | 'degraded' | 'offline'

const mediaGatewayConnectionOf = (row: JsonRecord): MediaGatewayConnection => {
  // 视频列表按枚举值判断连接状态，不能用本地化的展示文案判定在线。
  const raw = row.state ?? row.runningState ?? row.status
  const state = enumValueOf(typeof raw === 'string' ? raw : recordOf(raw).value)
  if (ONLINE_STATES.has(state)) return 'online'
  if (DEGRADED_STATES.has(state)) return 'degraded'
  return 'offline'
}

const isChannelOnline = (row: JsonRecord, gatewayConnection: MediaGatewayConnection): boolean => (
  // 与视频资源页一致：只有网关离线时强制通道离线，网关降级时仍以通道状态为准。
  gatewayConnection !== 'offline' && ONLINE_STATES.has(enumValueOf(row.status ?? row.state))
)

const queryDeviceCountSummary = async (
  baseTerms: DeviceDetailTerm[],
  signal?: AbortSignal,
): Promise<OverviewCountSummary> => {
  // 在线数与总数必须复用同一产品范围，避免卡片分子、分母统计到不同设备集合。
  const [total, online] = await Promise.all([
    queryDeviceDetailCount(baseTerms, signal),
    queryDeviceDetailCount([
      ...baseTerms,
      { column: 'state', value: 'online' },
    ], signal),
  ])

  return {
    total,
    online: Math.min(online, total),
  }
}

/** 查询项目内边端网关的当前在线数与总数。 */
export const queryOverviewGatewaySummary = (signal?: AbortSignal) => queryDeviceCountSummary(buildGatewayTerms(), signal)

/** 查询项目内物联设备的当前在线数与总数，不包含网关和视频接入产品。 */
export const queryOverviewIotDeviceSummary = (signal?: AbortSignal) => queryDeviceCountSummary(buildIotDeviceTerms(), signal)

export interface OverviewDeviceBreakdown { id: string; value?: number; offline?: number; failed?: boolean }

/** 与原设备类型统计保持相同请求和异常口径，空响应不能当作零。 */
async function queryOverviewBreakdownCount(terms: DeviceDetailTerm[]): Promise<number> {
  const response = await request.post('/device/instance/_count', { pageIndex: 0, pageSize: 1, terms }, { hiddenError: true })
  const source = recordOf(response), raw = unwrapResult(response), value = raw !== null && typeof raw === 'object' ? recordOf(raw).total : raw
  if (source.success === false || (typeof source.status === 'number' && source.status >= 400)
    || value === null || value === undefined || value === '') throw new Error('Missing device count')
  return countOf(response)
}

/** 设备类型构成与设备总数使用相同的资产范围，单项失败保留未知状态。 */
export async function queryOverviewIotDeviceBreakdown(): Promise<OverviewDeviceBreakdown[]> {
  return Promise.all(['device', 'gateway', 'childrenDevice'].map(async id => {
    const terms = [...buildIotDeviceTerms(), { column: 'deviceType', termType: 'eq', value: id }]
    try {
      const [value, offline] = await Promise.all([
        queryOverviewBreakdownCount(terms),
        queryOverviewBreakdownCount([...terms, { column: 'state', termType: 'not', value: 'online' }]),
      ])
      return { id, value, offline }
    } catch { return { id, failed: true } }
  }))
}

/** 最近访问仅补齐当前项目内已访问设备的名称，不拉取完整详情及运行数据。 */
export const queryOverviewDeviceNames = async (ids: readonly string[]): Promise<Map<string, string>> => {
  const deviceIds = [...new Set(ids.filter(id => id.trim()))]
  if (!deviceIds.length) return new Map()
  const response = await request.post('/device-instance/_query/no-paging?paging=false', {
    paging: false,
    includes: ['id', 'name'],
    terms: [{ column: 'id', termType: 'in', value: deviceIds }],
  }, { hiddenError: true })
  const source = recordOf(response)
  if ([source, recordOf(source.data)].some(item => item.success === false
    || (typeof item.status === 'number' && item.status >= 400))) throw new Error('Device names query failed')
  const result = unwrapResult(response)
  const page = recordOf(result)
  const rows: unknown = Array.isArray(result) ? result : page.data
  if (!Array.isArray(rows) || Number(page.total) > rows.length) throw new Error('Incomplete device names response')
  return new Map(rows.flatMap(value => {
    const row = recordOf(value), id = textOf(row.id)
    if (!id) throw new Error('Missing device identity')
    const name = typeof row.name === 'string' ? row.name.trim() : ''
    return deviceIds.includes(id) ? [[id, name] as const] : []
  }))
}

/** 设备分布与数量卡、统一设备列表共用同一产品范围。 */
export const buildOverviewDeviceTerms = (kind: 'edge' | 'iot' | 'video'): OverviewDeviceTerm[] => (
  kind === 'edge' ? buildGatewayTerms() : kind === 'video'
    ? [{ column: 'productId$product-info', value: `accessProvider in (${VIDEO_DEVICE_ACCESS_PROVIDERS.join(',')})` }]
    : buildIotDeviceTerms()
)

export interface OverviewChannelBreakdown extends OverviewCountSummary { id: string }

/** 视频入口共用当前账号可见的媒体设备目录。 */
async function queryOverviewMediaDevices(signal?: AbortSignal): Promise<JsonRecord[]> {
  const devices = await queryAllPages('/media/device/_query', {
    sorts: [
      { name: 'createTime', order: 'desc' },
      { name: 'name', order: 'desc' },
    ],
  }, signal)
  return devices.filter(row => textOf(row.id))
}

/** 各来源汇总已按设备资产范围查询的通道数量。 */
function groupOverviewChannelBreakdown(summaries: OverviewChannelBreakdown[]): OverviewChannelBreakdown[] {
  const groups = new Map<string, OverviewChannelBreakdown>()
  for (const current of summaries) {
    const previous = groups.get(current.id)
    groups.set(current.id, { id: current.id, total: (previous?.total ?? 0) + current.total, online: (previous?.online ?? 0) + current.online })
  }
  return [...groups.values()]
}

/** 复用视频列表的聚合接口。本地只按可见设备合并来源，设备离线时通道仍计入总数。 */
export async function querySaasOverviewChannelBreakdown(signal?: AbortSignal): Promise<OverviewChannelBreakdown[]> {
  const [devices, response] = await Promise.all([
    queryOverviewMediaDevices(signal),
    request.post('/media/device/channel/_summary', { paging: false }, { hiddenError: true, signal }),
  ])
  const result: unknown = response.result
  if (response.success === false || response.status >= 400 || !result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('Invalid media channel summary')
  }
  const byDevice = new Map(Object.entries(recordOf(result)))
  return groupOverviewChannelBreakdown(devices.map(device => {
    const stats = byDevice.get(textOf(device.id))
    const id = enumValueOf(device.provider)
    // 聚合结果只包含有通道的设备，缺少分组代表该设备没有通道。
    if (stats === undefined) return { id, total: 0, online: 0 }
    const { total, online } = recordOf(stats)
    if (typeof total !== 'number' || typeof online !== 'number'
      || !Number.isSafeInteger(total) || !Number.isSafeInteger(online) || online < 0 || total < online) {
      throw new Error('Invalid media channel counts')
    }
    return { id, total, online: mediaGatewayConnectionOf(device) === 'offline' ? 0 : online }
  }))
}

/** 按视频资源页统计接入来源；私有化 all 范围包含插件及扩展来源，默认保留现有数量卡口径。 */
export const queryOverviewChannelBreakdown = async (scope: 'default' | 'all' = 'default', signal?: AbortSignal): Promise<OverviewChannelBreakdown[]> => {
  const mediaDevices = (await queryOverviewMediaDevices(signal)).filter(row => (
    scope === 'all' || MEDIA_ACCESS_PROVIDERS.has(enumValueOf(row.provider))
  ))

  const summaries = await Promise.all(mediaDevices.map(async (device) => {
    const deviceId = textOf(device.id)
    const connection = mediaGatewayConnectionOf(device)
    try {
      const channels = await queryAllPages(
        `/media/device/${encodeURIComponent(deviceId)}/channel/_query`,
        { sorts: [{ name: 'createTime', order: 'desc' }] },
        signal,
      )
      return {
        id: enumValueOf(device.provider),
        total: channels.length,
        online: channels.filter(channel => isChannelOnline(channel, connection)).length,
      }
    } catch (error) {
      if (isAgentDisconnected(error)) return { id: enumValueOf(device.provider), total: 0, online: 0 }
      throw error
    }
  }))

  return groupOverviewChannelBreakdown(summaries)
}

/** 数量卡沿用同一接入来源统计结果，避免分布与总量使用不同范围。 */
export const queryOverviewChannelSummary = async (signal?: AbortSignal): Promise<OverviewCountSummary> => (
  (await queryOverviewChannelBreakdown('default', signal)).reduce((summary, current) => ({
    total: summary.total + current.total, online: summary.online + current.online,
  }), { total: 0, online: 0 })
)

/** 默认查询概览前几台网关；仪表盘指标可分页遍历同一网关范围。 */
export const queryOverviewGatewayPage = async (pageSize = 4, pageIndex = 0): Promise<OverviewGatewayPage> => {
  const response = await request.post(
    '/device/instance/detail/_query',
    { ...buildDetailQuery(buildGatewayTerms(), pageSize), pageIndex },
    { hiddenError: true },
  )
  const result = unwrapResult(response)
  const page = recordOf(result)
  const rows = Array.isArray(page.data) ? page.data : []

  return {
    data: rows.map((value) => {
      const row = recordOf(value)
      const id = textOf(row.id)
      const state = row.connectionStatus ?? row.status ?? row.state
      const stateValue = enumValueOf(state)
      // 与设备列表的三态口径一致，保留禁用状态，不能把所有非在线节点归为离线。
      const connectionStatus: OverviewGatewayItem['connectionStatus'] =
        stateValue === 'online' || stateValue === 'offline' ? stateValue : 'disabled'
      return {
        id,
        name: textOf(row.name, id, globalI18n.global.t('comm.table.empty')),
        productId: textOf(row.productId) || undefined,
        productName: textOf(row.productName) || undefined,
        connectionStatus,
        connectionStatusText: textOf(recordOf(state).text) || undefined,
        online: connectionStatus === 'online',
      }
    }).filter(item => item.id),
    total: countOf(page.total ?? rows.length),
  }
}
