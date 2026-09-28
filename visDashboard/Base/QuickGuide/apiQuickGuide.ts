import { request } from '@jetlinks-web/core'
import { countOf, recordOf, rowsOf, textOf } from '../shared/apiResult'
import type { HomeRow } from '../shared/types'

const collectSpaceIds = (rows: Record<string, unknown>[]): string[] => rows.flatMap(row => [
  textOf(row.id),
  ...collectSpaceIds(Array.isArray(row.children) ? row.children.map(recordOf) : []),
]).filter(Boolean)

/** 步骤 3 需要已有空间且至少一条设备绑定；默认空空间树不算完成。 */
export async function loadQuickGuideRows(): Promise<HomeRow[]> {
  const tree = rowsOf(await request.post('/space/_query/tree', { paging: false }, { hiddenError: true }))
  const spaceIds = [...new Set(collectSpaceIds(tree))]
  if (!spaceIds.length) return [{ id: 'space', value: 0 }]
  const count = countOf(await request.post('/space/data-bind/_count', {
    terms: [{ column: 'spaceId', termType: 'in', value: spaceIds }],
  }, { hiddenError: true }))
  return [{ id: 'space', value: count }]
}
