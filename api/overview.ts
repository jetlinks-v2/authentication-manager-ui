import { request } from '@jetlinks-web/core'

type JsonRecord = Record<string, unknown>

type DeviceDetailTerm = {
  column: string
  termType?: string
  value: unknown
}

export interface OverviewCountSummary {
  total: number
  online: number
}

export interface OverviewGatewayItem {
  id: string
  name: string
  productId?: string
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

const NON_IOT_ACCESS_PROVIDERS = [
  ...GATEWAY_ACCESS_PROVIDERS,
  'official-edge-gateway',
  'fixed-media',
  'gb28181-2016',
  'media-plugin',
  'onvif',
] as const

const MEDIA_ACCESS_PROVIDERS = new Set([
  'agent-media-device-gateway',
  'fixed-media',
  'gb28181-2016',
  'onvif',
])

const ONLINE_STATES = new Set(['online', 'connected', 'success'])
const DEGRADED_STATES = new Set(['degraded', 'warn', 'warning'])
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

const buildGatewayTerms = (): DeviceDetailTerm[] => [
  {
    column: 'productId$product-info',
    value: [{ column: 'deviceType', termType: 'eq', value: 'gateway' }],
  },
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

const queryDeviceDetailCount = async (terms: DeviceDetailTerm[]): Promise<number> => {
  const response = await request.post(
    '/device/instance/_count',
    buildDetailQuery(terms),
    { hiddenError: true },
  )
  return countOf(response)
}

const rowsOfPage = (response: unknown): { rows: JsonRecord[]; total: number } => {
  const result = unwrapResult(response)
  if (Array.isArray(result)) {
    return { rows: result.map(recordOf), total: result.length }
  }

  const page = recordOf(result)
  const rows = Array.isArray(page.data) ? page.data.map(recordOf) : []
  const total = Number(page.total)
  return {
    rows,
    total: Number.isFinite(total) && total >= 0 ? total : rows.length,
  }
}

const queryAllPages = async (
  path: string,
  query: JsonRecord,
): Promise<JsonRecord[]> => {
  const rows: JsonRecord[] = []
  let pageIndex = Number(query.pageIndex ?? 0)
  let total = Number.POSITIVE_INFINITY

  while (rows.length < total) {
    const response = await request.post(
      path,
      { ...query, pageIndex, pageSize: MEDIA_PAGE_SIZE },
      { hiddenError: true },
    )
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
  const state = enumValueOf(row.state ?? row.runningState ?? row.status)
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
): Promise<OverviewCountSummary> => {
  // 在线数与总数必须复用同一产品范围，避免卡片分子、分母统计到不同设备集合。
  const [total, online] = await Promise.all([
    queryDeviceDetailCount(baseTerms),
    queryDeviceDetailCount([
      ...baseTerms,
      { column: 'state', value: 'online' },
    ]),
  ])

  return {
    total,
    online: Math.min(online, total),
  }
}

/** 查询项目内边端网关的当前在线数与总数。 */
export const queryOverviewGatewaySummary = () => queryDeviceCountSummary(buildGatewayTerms())

/** 查询项目内物联设备的当前在线数与总数，不包含网关和视频接入产品。 */
export const queryOverviewIotDeviceSummary = () => queryDeviceCountSummary(buildIotDeviceTerms())

/** 空间分布复用数量卡的产品范围，读取完整设备 ID 集合以排除视频产品和网关。 */
export const queryOverviewDeviceIds = async (kind: 'edge' | 'iot'): Promise<Set<string>> => {
  const terms = kind === 'edge' ? buildGatewayTerms() : buildIotDeviceTerms()
  const rows = await queryAllPages('/device/instance/_query', { terms, includes: ['id'] })
  return new Set(rows.map(row => textOf(row.id)).filter(Boolean))
}

/** 按视频资源页的设备与通道链路统计当前在线通道和通道总数。 */
export const queryOverviewChannelSummary = async (): Promise<OverviewCountSummary> => {
  const mediaDevices = (await queryAllPages('/media/device/_query', {
    sorts: [
      { name: 'createTime', order: 'desc' },
      { name: 'name', order: 'desc' },
    ],
  })).filter((row) => (
    textOf(row.id) && MEDIA_ACCESS_PROVIDERS.has(enumValueOf(row.provider))
  ))

  const summaries = await Promise.all(mediaDevices.map(async (device) => {
    const deviceId = textOf(device.id)
    const connection = mediaGatewayConnectionOf(device)
    try {
      const channels = await queryAllPages(
        `/media/device/${encodeURIComponent(deviceId)}/channel/_query`,
        { sorts: [{ name: 'createTime', order: 'desc' }] },
      )
      return {
        total: channels.length,
        online: channels.filter(channel => isChannelOnline(channel, connection)).length,
      }
    } catch (error) {
      if (isAgentDisconnected(error)) return { total: 0, online: 0 }
      throw error
    }
  }))

  return summaries.reduce<OverviewCountSummary>((summary, current) => ({
    total: summary.total + current.total,
    online: summary.online + current.online,
  }), { total: 0, online: 0 })
}


/** 查询概览页展示的前几台网关；运行指标由展示层保留既有演示数据。 */
export const queryOverviewGatewayPage = async (pageSize = 4): Promise<OverviewGatewayPage> => {
  const response = await request.post(
    '/device/instance/detail/_query',
    buildDetailQuery(buildGatewayTerms(), pageSize),
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
      return {
        id,
        name: textOf(row.name, id, '--'),
        productId: textOf(row.productId) || undefined,
        online: enumValueOf(state) === 'online',
      }
    }).filter(item => item.id),
    total: countOf(page.total ?? rows.length),
  }
}
