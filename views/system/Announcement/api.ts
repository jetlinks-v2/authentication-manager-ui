import dayjs from 'dayjs'
import { request } from '@jetlinks-web/core'

export type AnnouncementState = 'unpublished' | 'published'
export const SYSTEM_BULLETIN_PROVIDER = 'SystemBulletin'

export interface AnnouncementType {
  value: string
  text: string
}

export interface AnnouncementRecord {
  id: string
  title: string
  content: string
  state: AnnouncementState
  stateText: string
  type: AnnouncementType
  deployTime: string
  createTime: string
  modifyTime: string
  creatorName: string
  userIds: string[]
  organizationIds: string[]
}

export interface AnnouncementDraft {
  id?: string
  title: string
  content: string
  type: AnnouncementType
  userIds: string[]
  organizationIds: string[]
  publish: boolean
}

export interface AnnouncementQuery {
  pageIndex?: number
  pageSize?: number
  terms?: Array<Record<string, unknown>>
  sorts?: Array<Record<string, unknown>>
}

export interface SystemBulletinReference {
  bulletinId: string
  publishVersion: number
}

export interface SystemBulletinNotificationDetail {
  id: string
  title: string
  content: string
  type?: AnnouncementType
  deployTime?: number | null
}

interface EnumValue<T extends string> {
  value: T
  text?: string
}

interface SystemBulletin {
  id: string
  title: string
  content: string
  type?: string | EnumValue<string>
  state?: AnnouncementState | EnumValue<AnnouncementState>
  deployTime?: number | null
  createTime?: number | null
  modifyTime?: number | null
  creatorName?: string
  dimension?: SystemBulletinDimension[]
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

const formatTime = (value?: number | null) => value
  ? dayjs(value).format('YYYY-MM-DD HH:mm')
  : ''

/** 将后端枚举对象与毫秒时间统一转换为公告页面使用的数据结构。 */
const normalizeBulletin = (record: SystemBulletin): AnnouncementRecord => {
  const state = typeof record.state === 'object' ? record.state.value : record.state || 'unpublished'
  const stateText = typeof record.state === 'object' ? record.state.text || '' : ''
  const type = typeof record.type === 'object'
    ? { value: record.type.value, text: record.type.text || record.type.value }
    : { value: record.type || 'default', text: record.type || '' }
  const dimensionMap = new Map(
    (record.dimension || []).map(item => [item.dimensionType, item.dimensionIds || []]),
  )
  return {
    id: record.id,
    title: record.title,
    content: record.content,
    type,
    state,
    stateText,
    deployTime: formatTime(record.deployTime),
    createTime: formatTime(record.createTime),
    modifyTime: formatTime(record.modifyTime),
    creatorName: record.creatorName || '',
    userIds: dimensionMap.get('user') || [],
    organizationIds: dimensionMap.get('org') || [],
  }
}

/** 查询后端公告类型字典，选择器展示 text、提交 value。 */
export const getAnnouncementTypes = async (): Promise<AnnouncementType[]> => {
  const response = await request.get('/dictionary/s_bulletin_type/items') as ApiResponse<Array<EnumValue<string>>>
  return (response.result || []).map(item => ({
    value: item.value,
    text: item.text || item.value,
  }))
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

/** 解析公告通知中的发布批次引用，不读取通知内嵌正文。 */
export const resolveSystemBulletinReference = (
  notification: Record<string, any>,
): SystemBulletinReference | undefined => {
  let detail = notification.detail
  if (!detail && typeof notification.detailJson === 'string') {
    try {
      detail = JSON.parse(notification.detailJson)
    } catch {
      return undefined
    }
  }
  const bulletinId = String(detail?.bulletinId || detail?.id || notification.dataId || '').trim()
  const publishVersion = Number(detail?.publishVersion)
  if (!bulletinId || !Number.isInteger(publishVersion) || publishVersion <= 0) {
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
    { publishVersion: reference.publishVersion },
    { hiddenError: true },
  ) as ApiResponse<SystemBulletin>
  const detail = response.result
  const type = typeof detail.type === 'object'
    ? { value: detail.type.value, text: detail.type.text || detail.type.value }
    : detail.type
      ? { value: detail.type, text: detail.type }
      : undefined
  return {
    id: detail.id,
    title: detail.title,
    content: detail.content,
    type,
    deployTime: detail.deployTime,
  }
}

/** 保存未发布公告，或通过 deployType=now 保存并立即发布。 */
export const saveAnnouncement = (draft: AnnouncementDraft) => {
  const dimension = [
    { dimensionType: 'user', dimensionIds: draft.userIds },
    { dimensionType: 'org', dimensionIds: draft.organizationIds },
  ].filter(item => item.dimensionIds.length > 0)

  return request.post('/system/bulletin/_save', {
    id: draft.id,
    title: draft.title,
    content: draft.content,
    type: draft.type,
    allVisible: dimension.length === 0,
    dimension,
    state: 'unpublished',
    deployType: draft.publish ? 'now' : 'manual',
    deployConfig: {},
  })
}

/** 发布一条未发布公告。 */
export const publishAnnouncement = (id: string) => request.put(
  '/system/bulletin/_deploy',
  {},
  { params: { id } },
)

/** 撤回一条已发布公告。 */
export const withdrawAnnouncement = (id: string) => request.put(
  '/system/bulletin/_revocation',
  {},
  { params: { id } },
)

/** 删除未发布公告，DELETE 请求体按后端批量接口提交 ID 数组。 */
export const deleteAnnouncement = (id: string) => request.remove(
  '/system/bulletin/_batch',
  {},
  { data: [id] },
)
