import { request } from '@jetlinks-web/core'
import { getProjectCodeFromLocation } from '@jetlinks-web-core/utils/project-runtime'
import { getProjectStorage } from '@jetlinks-web-core/utils/project-storage'
import { getRequestTenantDomain } from '@jetlinks-web-core/utils/request-context'
import dayjs from 'dayjs'
import { recordOf, resultOf, rowsOf, textOf } from './apiResult'
import { HOME_TARGETS } from './navigation'
import type { HomeRow } from './types'
import { resolveAnnouncementText } from '../../../views/system/Announcement/announcementI18n'
/** 检查通知是否未读，兼容对象与字符串枚举。 */
const isUnread = (row: Record<string, unknown>) => {
  const state = row.state
  const stateVal = typeof state === 'object' && state !== null
    ? (state as Record<string, unknown>).value
    : state
  return stateVal === 'unread'
}

/** 新旧通知都优先显示公告自身标题，损坏的内嵌 JSON 不影响列表。 */
const parseAnnouncementDetail = (row: Record<string, unknown>) => {
  let detail = recordOf(row.detail)
  if (!Object.keys(detail).length && typeof row.detailJson === 'string') {
    try { detail = recordOf(JSON.parse(row.detailJson)) } catch { /* 保留通知字段回显。 */ }
  }
  return detail
}

const announcementTitle = (row: Record<string, unknown>) => {
  const detail = parseAnnouncementDetail(row)
  return resolveAnnouncementText(detail, 'title')
    || textOf(row.topicName === '系统公告' ? row.message || row.topicName : row.topicName || row.message)
}

const announcementSummary = (row: Record<string, unknown>) => {
  return resolveAnnouncementText(parseAnnouncementDetail(row), 'summary') || textOf(row.message)
}
export const loadAnnouncements = async (): Promise<HomeRow[]> => {
  const terms: { column: string; termType: string; value: unknown }[] = [
    { column: 'topicProvider', termType: 'eq', value: 'SystemBulletin' },
  ]
  if (getRequestTenantDomain()) {
    // 项目 code 不等于租户 ID；缺少入口保存的 ID 时，读取服务端按域名解析的响应头，不从账号租户维度猜测。
    let tenantId = getProjectStorage(getProjectCodeFromLocation())?.id
    if (!tenantId) {
      resultOf(await request.get('/authorize/context', {}, {
        hiddenError: true,
        transformResponse: [(data: string, headers: Record<string, unknown>) => {
          tenantId = textOf(headers['x-tenant-id'])
          return JSON.parse(data)
        }],
      }))
    }
    if (!tenantId) throw new Error('Missing current project tenant')
    terms.push({
      column: 'dataId', termType: 'system-bulletin-notification',
      value: [{ column: 'tenantId', termType: 'eq', value: tenantId }],
    })
  }
  const result = await request.post('/notifications/_query', {
    paging: true, pageSize: 5, pageIndex: 0,
    sorts: [{ name: 'notifyTime', order: 'desc' }],
    terms,
  }, { hiddenError: true })
  return rowsOf(result).map((row, index) => {
    const isNew = index === 0 && isUnread(row)
    const timeVal = Number(row.notifyTime) || (row.notifyTime as string)
    return {
      id: textOf(row.id),
      label: announcementTitle(row),
      description: announcementSummary(row),
      notification: row,
      isNew,
      date: timeVal != null && dayjs(timeVal).isValid() ? dayjs(timeVal).format('YYYY.MM.DD') : '',
      target: HOME_TARGETS.messages,
    }
  })
}
