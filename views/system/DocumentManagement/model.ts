import type { ConditionTerm } from '@jetlinks-web-core/components/ConditionFilter'
import { documentHelpPointId } from '@jetlinks-web-core/utils/documentHelpRegistry'
import { hasDocumentHelpContent } from '@jetlinks-web-core/utils/documentHelpContent'
import type { DocumentHelpConfiguration } from '../../../api/system/documentHelp'

export interface DocumentHelpRow extends DocumentHelpConfiguration {
  id: string
  name: string
  page: string
  location?: string
  enabled: boolean
  configured: boolean
}

/** 以注册清单为点位事实源，扫描只合并内容，不覆盖已有配置。 */
export function mergeHelpPoints(points: (Pick<DocumentHelpRow, 'code' | 'key' | 'name' | 'page'> & { location?: string })[], configurations: DocumentHelpConfiguration[]): DocumentHelpRow[] {
  const contents = new Map(configurations.map(item => [documentHelpPointId(item.code, item.key), item]))
  return points.map(point => {
    const id = documentHelpPointId(point.code, point.key)
    const configuration = contents.get(id)
    const content = configuration?.content || ''
    const configured = hasDocumentHelpContent(configuration)
    return { ...point, page: point.location ? `${point.page} / ${point.location}` : point.page, id, content,
      i18nMessages: configuration?.i18nMessages, enabled: configured && configuration?.enabled !== false, configured }
  })
}

function matchesTerms(row: DocumentHelpRow, terms: ConditionTerm[]): boolean {
  return terms.reduce((matched, term, index) => {
    const value = String(row[term.column as keyof DocumentHelpRow] ?? '').toLocaleLowerCase()
    const expected = String(term.value ?? '').toLocaleLowerCase()
    const current = term.terms?.length ? matchesTerms(row, term.terms)
      : !term.column ? true : term.termType === 'eq' ? value === expected : value.includes(expected)
    return index === 0 ? current : term.type === 'or' ? matched || current : matched && current
  }, true)
}

export function filterHelpPoints(rows: DocumentHelpRow[], scope: string, terms: ConditionTerm[]): DocumentHelpRow[] {
  return rows.filter(row => (scope === 'all' || (scope === 'ready' ? row.configured
    : scope === 'missing' ? !row.configured : row.code === scope.slice(6))) && matchesTerms(row, terms))
}

/** 表格仅显示一行说明摘要，完整 Markdown 在 helper 预览中呈现。 */
export function helpContentSummary(content: string): string {
  return content.replace(/<[^>]*>/g, '').replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#*_`>|~]/g, '').replace(/\s+/g, ' ').trim()
}
