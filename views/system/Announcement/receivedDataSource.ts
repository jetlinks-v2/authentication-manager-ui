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

/** 本地批次按发布版本分组，避免把旧版本确认应用到重发后的公告。 */
const batchTerms = (term: Term): Term => {
  const negative = ['not', 'neq', 'nin'].includes(term.termType)
  const groups = new Map<number, string[]>()
  const values = Array.isArray(term.value) ? term.value : [term.value]
  values.forEach(value => {
    const match = /^(.+):(\d+)$/.exec(String(value))
    if (!match) return
    const version = Number(match[2])
    const ids = groups.get(version) || []
    ids.push(match[1])
    groups.set(version, ids)
  })
  if (!groups.size) return { type: term.type, column: 'id', termType: negative ? 'notnull' : 'isnull' }
  return {
    type: term.type,
    terms: [...groups].map(([version, ids]) => ({
      type: negative ? 'and' : 'or',
      terms: [
        { column: 'publishVersion', termType: negative ? 'not' : 'eq', value: version },
        { column: 'id', termType: negative ? 'nin' : 'in', value: ids, type: negative ? 'or' : 'and' },
      ],
    })),
  }
}

const bulletinFields: Record<string, string> = {
  topicName: 'title', message: 'summary', notifyTime: 'deployTime', bulletinId: 'id', sourceId: 'id',
}

/** 通知界面的字段仅在数据源边界适配，独立公告接口直接使用实体 QueryParam。 */
const bulletinTerms = (terms: Term[]): Term[] => terms.map(term => {
  if (!term.column) return { ...term, terms: bulletinTerms(term.terms || []) }
  if (term.column === 'id' && ['eq', 'not', 'neq', 'in', 'nin'].includes(term.termType || 'eq')) {
    return batchTerms(term)
  }
  if (term.column === 'topicProvider') {
    const values = Array.isArray(term.value) ? term.value : [term.value]
    const matches = values.includes('SystemBulletin') !== ['not', 'neq', 'nin'].includes(term.termType)
    return { type: term.type, column: 'id', termType: matches ? 'notnull' : 'isnull' }
  }
  return { ...term, column: bulletinFields[term.column] || term.column }
})

const localQuery = (query: Query, scope: string | undefined) => ({
  ...query,
  sorts: query.sorts?.map((sort: Query) => ({ ...sort, name: bulletinFields[sort.name] || sort.name })),
  terms: bulletinTerms(transformAnnouncementStateTerms(query.terms || [], getAnnouncementReadIds(scope))),
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
    includes: ['id', 'publishVersion'],
  })
  if (response.success) {
    changeAnnouncementLocalState('_read', (response.result || []).map((record: Query) => record.id), scope)
  }
  return response
}
