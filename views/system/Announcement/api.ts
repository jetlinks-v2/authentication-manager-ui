import dayjs from 'dayjs'
import { request } from '@jetlinks-web/core'
import {
  buildAnnouncementI18nFields,
  resolveAnnouncementText,
  type AnnouncementI18n,
} from './announcementI18n'

export type AnnouncementState = 'unpublished' | 'published'
export const SYSTEM_BULLETIN_PROVIDER = 'SystemBulletin'
export const SYSTEM_BULLETIN_CHANNEL = 'inside-mail'

export interface AnnouncementDeliveryScope {
  saas: boolean
  regionIds: string[]
}

export interface AnnouncementDeliveryRequest {
  all: boolean
  runtimes: Array<{
    id: string
    projects: string[]
  }>
}

export interface AnnouncementRegionOption {
  label: string
  value: string
}

export interface AnnouncementRecord {
  id: string
  title: string
  summary?: string
  content: string
  state: AnnouncementState
  stateText: string
  type: string
  typeText: string
  deployTime: string
  createTime: string
  modifyTime: string
  creatorName: string
  userIds: string[]
  organizationIds: string[]
  popup: boolean
  deliveryScope: AnnouncementDeliveryScope
  others?: Record<string, unknown>
  i18nMessages?: AnnouncementI18n
  legacyTitle?: string
  legacySummary?: string
  legacyContent?: string
}

export interface AnnouncementDraft {
  id?: string
  title: string
  summary?: string
  content: string
  type: string
  popup: boolean
  deliveryScope: AnnouncementDeliveryScope
  publish: boolean
  others?: Record<string, unknown>
  i18nMessages?: unknown
}

export interface AnnouncementQuery {
  paging?: boolean
  pageIndex?: number
  pageSize?: number
  terms?: Array<Record<string, unknown>>
  sorts?: Array<Record<string, unknown>>
}

export interface SystemBulletinReference {
  bulletinId: string
  publishVersion?: number
}

export interface SystemBulletinNotificationDetail {
  id: string
  title: string
  summary?: string
  content: string
  type?: string
  typeText?: string
  deployTime?: number | null
  popup: boolean
  i18nMessages?: AnnouncementI18n
}

interface EnumValue<T extends string> {
  value: T
  text?: string
}

interface SystemBulletin {
  id: string
  title: string
  summary?: string
  content: string
  type?: string | EnumValue<string>
  state?: AnnouncementState | EnumValue<AnnouncementState>
  deployTime?: number | null
  createTime?: number | null
  modifyTime?: number | null
  creatorName?: string
  others?: Record<string, unknown>
  dimension?: SystemBulletinDimension[]
  i18nMessages?: AnnouncementI18n
}

interface SystemBulletinDimension {
  dimensionType: string
  dimensionIds: string[]
}

interface PageResult<T> {
  data: T[]
  total: number
  pageIndex: number
  pageSize: number
}

interface ApiResponse<T> {
  success: boolean
  result: T
}

const formatTime = (value?: number | null) => value ? dayjs(value).format('YYYY-MM-DD HH:mm') : ''

/** 滚动升级期间兼容旧枚举对象；页面模型和新保存请求始终使用字符串。 */
export const normalizeBulletinType = (value: unknown, fallback = ''): string => {
  const raw = value && typeof value === 'object'
    ? (value as { value?: unknown }).value
    : value
  return String(raw ?? '').trim() || fallback
}

/** 历史公告没有范围字段时沿用旧行为，仅投递 SaaS 端。 */
const normalizeDeliveryScope = (others?: Record<string, unknown>): AnnouncementDeliveryScope => {
  const raw = others?.deliveryScope
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { saas: true, regionIds: [] }
  }
  const scope = raw as Record<string, unknown>
  return {
    saas: scope.saas === true,
    regionIds: Array.isArray(scope.regionIds)
      ? [...new Set(scope.regionIds
          .filter(item => item !== null && item !== undefined)
          .map(String)
          .map(item => item.trim())
          .filter(Boolean))]
      : [],
  }
}

/** 将后端状态枚举与毫秒时间统一转换为公告页面使用的数据结构。 */
const normalizeBulletin = (record: SystemBulletin): AnnouncementRecord => {
  const state = typeof record.state === 'object' ? record.state.value : record.state || 'unpublished'
  const stateText = typeof record.state === 'object' ? record.state.text || '' : ''
  const dimensionMap = new Map(
    (record.dimension || []).map(item => [item.dimensionType, item.dimensionIds || []]),
  )
  const type = normalizeBulletinType(record.type, 'default')
  return {
    id: record.id,
    title: resolveAnnouncementText(record, 'title'),
    summary: resolveAnnouncementText(record, 'summary'),
    content: resolveAnnouncementText(record, 'content'),
    i18nMessages: record.i18nMessages,
    legacyTitle: record.title || '',
    legacySummary: record.summary || '',
    legacyContent: record.content || '',
    type,
    typeText: resolveAnnouncementText({ ...record, type }, 'type'),
    state,
    stateText,
    deployTime: formatTime(record.deployTime),
    createTime: formatTime(record.createTime),
    modifyTime: formatTime(record.modifyTime),
    creatorName: record.creatorName || '',
    userIds: dimensionMap.get('user') || [],
    organizationIds: dimensionMap.get('org') || [],
    popup: record.others?.popup === true,
    deliveryScope: normalizeDeliveryScope(record.others),
    others: record.others,
  }
}

/** 分页查询公告管理详情，并转换枚举与时间字段。 */
export const queryAnnouncements = async (query: AnnouncementQuery) => {
  const response = await request.post('/system/bulletin/detail/_query', query) as ApiResponse<PageResult<SystemBulletin>>
  return {
    ...response,
    result: {
      ...response.result,
      data: response.result.data.map(normalizeBulletin),
    },
  }
}

/** 查询单条公告管理详情。 */
export const getAnnouncement = async (id: string): Promise<AnnouncementRecord> => {
  const response = await request.get(`/system/bulletin/${id}/detail`) as ApiResponse<SystemBulletin>
  return normalizeBulletin(response.result)
}

/** 兼容对象或 JSON 字符串通知详情；无法解析时返回 undefined。 */
export const parseSystemBulletinDetail = (
  notification: Record<string, any>,
): Record<string, any> | undefined => {
  let detail = notification?.detail
  if (typeof detail === 'string') {
    try {
      detail = JSON.parse(detail)
    } catch {
      detail = undefined
    }
  }
  if (!detail && typeof notification?.detailJson === 'string') {
    try {
      detail = JSON.parse(notification.detailJson)
    } catch {
      return undefined
    }
  }
  return detail && typeof detail === 'object' ? detail : undefined
}

/** 解析公告发布批次引用，用于按发布版本查询通知正文。 */
export const resolveSystemBulletinReference = (
  notification: Record<string, any>,
): SystemBulletinReference | undefined => {
  const detail = parseSystemBulletinDetail(notification)
  const legacyDataId = String(notification.dataId || '').trim()
  const bulletinId = String(
    notification.bulletinId
    || detail?.bulletinId
    || detail?.id
    || notification.sourceId
    // 新接收视图的 dataId 是“公告ID:版本”；缺少显式版本字段时不能把批次 ID 当公告 ID。
    || (legacyDataId.includes(':') ? '' : legacyDataId)
    || '',
  ).trim()
  if (!bulletinId) return undefined
  // 旧通知不携带版本号，仍由当前用户正文接口校验可见性；显式非法版本不降级。
  const rawPublishVersion = notification.publishVersion ?? detail?.publishVersion
  if (rawPublishVersion === undefined || rawPublishVersion === null) return { bulletinId }
  const publishVersion = Number(rawPublishVersion)
  if (!Number.isInteger(publishVersion) || publishVersion <= 0) {
    return undefined
  }
  return { bulletinId, publishVersion }
}

/** 按通知发布版本查询当前用户可见的公告正文。 */
export const getSystemBulletinNotificationDetail = async (
  reference: SystemBulletinReference,
): Promise<SystemBulletinNotificationDetail> => {
  const response = await request.get(
    `/system/bulletin/${encodeURIComponent(reference.bulletinId)}`,
    reference.publishVersion === undefined ? {} : { publishVersion: reference.publishVersion },
    { hiddenError: true },
  ) as ApiResponse<SystemBulletin>
  const detail = response.result
  const type = normalizeBulletinType(detail.type)
  return {
    id: detail.id,
    title: resolveAnnouncementText(detail, 'title'),
    summary: resolveAnnouncementText(detail, 'summary'),
    content: resolveAnnouncementText(detail, 'content'),
    i18nMessages: detail.i18nMessages,
    type: type || undefined,
    typeText: resolveAnnouncementText({ ...detail, type }, 'type') || undefined,
    deployTime: detail.deployTime,
    popup: detail.others?.popup === true,
  }
}

/** 接收资格由服务端判断，确认状态由公告模块按账号和发布版本在浏览器本地维护。 */
export {
  queryAnnouncementInbox,
  queryAnnouncementInboxNoPaging,
  countAnnouncementInbox,
  countAnnouncementUnread,
  changeAnnouncementReadState,
  markAllAnnouncementsRead,
} from './receivedDataSource'

/** 保存未发布公告及其 SaaS/区域投递范围。 */
export const saveAnnouncement = async (draft: AnnouncementDraft): Promise<string> => {
  const {
    i18nMessages,
    title,
    summary,
    type,
    content,
  } = buildAnnouncementI18nFields(draft)

  const response = await request.post('/system/bulletin/_save', {
    id: draft.id,
    title,
    summary: summary || undefined,
    content,
    i18nMessages,
    type,
    others: {
      ...(draft.others || {}),
      popup: draft.popup,
      deliveryScope: {
        saas: draft.deliveryScope.saas,
        regionIds: [...new Set(draft.deliveryScope.regionIds)],
      },
    },
  }) as ApiResponse<string>
  return String(response.result || draft.id || '')
}

/** 将编辑回显范围转换为单次发布/撤回契约，项目级范围开放前始终提交空 projects。 */
const buildDeliveryRequest = (
  scope: AnnouncementDeliveryScope,
): AnnouncementDeliveryRequest => ({
  all: scope.saas,
  runtimes: [...new Set(scope.regionIds
    .map(id => id.trim())
    .filter(Boolean))]
    .map(id => ({ id, projects: [] })),
})

/** 发布一条未发布公告；本次请求 Body 是后端执行投递的唯一范围。 */
export const publishAnnouncement = (id: string, scope: AnnouncementDeliveryScope) => request.put(
  '/saas/bulletin/_deploy',
  buildDeliveryRequest(scope),
  { params: { id } },
)

/** 撤回一条已发布公告。 */
export const withdrawAnnouncement = (id: string, scope: AnnouncementDeliveryScope) => request.put(
  '/saas/bulletin/_revocation',
  buildDeliveryRequest(scope),
  { params: { id } },
)

/** 查询运营端可选区域，公告只保存区域 ID，不在前端展开项目。 */
export const queryAnnouncementRegions = async (): Promise<AnnouncementRegionOption[]> => {
  const response = await request.post('/saas/runtime/_query/', {
    pageIndex: 0,
    pageSize: 1000,
    sorts: [{ name: 'createTime', order: 'desc' }],
  }) as ApiResponse<PageResult<{ id: string; name?: string }>>
  return (response.result?.data || []).map(region => ({
    label: region.name || region.id,
    value: region.id,
  }))
}

/** 删除未发布公告。 */
export const deleteAnnouncement = (id: string) => request.remove(
  '/system/bulletin/_batch',
  {},
  { data: [id] },
)
