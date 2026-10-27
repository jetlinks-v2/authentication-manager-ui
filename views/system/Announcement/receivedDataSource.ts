import { request } from '@jetlinks-web/core'
import i18n from '@jetlinks-web-core/locales'
import {
  changeAnnouncementLocalState,
  getAnnouncementReadIds,
  getAnnouncementReadScope,
} from './localReadStore'

type Query = Record<string, any>
type Term = Record<string, any>
const RECEIVED_PATH = '/system/bulletin/received'

/** 递归保留 AND/OR 分组，只将本地 state 谓词替换成后端普通 ID 条件。 */
export const transformAnnouncementStateTerms = (terms: Term[], readIds: string[]): Term[] => terms.map(term => {
  const transformed = { ...term }
  if (Array.isArray(term.terms)) transformed.terms = transformAnnouncementStateTerms(term.terms, readIds)
  if (term.column !== 'state') return transformed
  const operator = term.termType || 'eq'
  const values = (Array.isArray(term.value) ? term.value : String(term.value).split(','))
    .map(value => typeof value === 'object' ? value?.value : value)
  const negative = ['not', 'neq', 'nin'].includes(operator)
  if (!['eq', 'not', 'neq', 'in', 'nin'].includes(operator)) {
    throw new Error(`Unsupported announcement state condition: ${operator}`)
  }
  const matches = (state: string) => values.includes(state) !== negative
  const read = matches('read'), unread = matches('unread')
  // 接收批次 ID 必定非空；常量谓词避免空 IN 被查询框架忽略，保留嵌套 OR 的真值。
  if (read === unread || !readIds.length) {
    const all = read === unread ? read : unread
    return { ...transformed, column: 'id', termType: all ? 'notnull' : 'isnull', value: undefined }
  }
  return { ...transformed, column: 'id', termType: read ? 'in' : 'nin', value: readIds }
})

const localQuery = (query: Query, scope: string | undefined) => ({
  ...query,
  terms: transformAnnouncementStateTerms(query.terms || [], getAnnouncementReadIds(scope)),
})

const injectState = (record: Query, ids: Set<string>) => {
  const value = ids.has(record.id) ? 'read' : 'unread'
  return {
    ...record,
    state: { value, text: i18n.global.t(value === 'read' ? 'NotificationRecord.index.803553-9' : 'NotificationRecord.index.803553-8') },
  }
}

const queryRecords = async (path: string, query: Query) => {
  const scope = getAnnouncementReadScope()
  const response = await request.post(`${RECEIVED_PATH}${path}`, localQuery(query, scope))
  if (!response.success) return response
  const ids = new Set(getAnnouncementReadIds(scope))
  return {
    ...response,
    result: Array.isArray(response.result)
      ? response.result.map((record: Query) => injectState(record, ids))
      : { ...response.result, data: (response.result?.data || []).map((record: Query) => injectState(record, ids)) },
  }
}

export const queryAnnouncementInbox = (query: Query = {}) => queryRecords('/_query', query)
export const queryAnnouncementInboxNoPaging = (query: Query = {}) => queryRecords('/_query/no-paging', query)
export const countAnnouncementInbox = (query: Query = {}) => request.post(
  `${RECEIVED_PATH}/_count`, localQuery(query, getAnnouncementReadScope()),
)

/** 未读统计由后端在当前可见资格内执行，不能减去本地不可见的历史确认数。 */
export const countAnnouncementUnread = async (query: Query = {}) => {
  const response = await countAnnouncementInbox({
    ...query,
    terms: [
      { terms: query.terms || [] },
      { column: 'state', termType: 'eq', value: 'unread' },
    ],
  })
  if (!response.success) return response
  const count = Number(response.result || 0)
  const limit = Number(query.pageSize || 99)
  return { ...response, result: { count: Math.min(count, limit), overflow: count > limit } }
}

export const changeAnnouncementReadState = async (type: '_read' | '_unread', ids: string[]) => {
  changeAnnouncementLocalState(type, ids)
  return { status: 200, success: true, result: true }
}

/** 全部确认只投影当次可见批次 ID，异步期间切换账号不会写入新账号作用域。 */
export const markAllAnnouncementsRead = async () => {
  const scope = getAnnouncementReadScope()
  const response = await request.post(`${RECEIVED_PATH}/_query/no-paging`, {
    paging: false,
    includes: ['id'],
  })
  if (response.success) {
    changeAnnouncementLocalState('_read', (response.result || []).map((record: Query) => record.id), scope)
  }
  return response
}
