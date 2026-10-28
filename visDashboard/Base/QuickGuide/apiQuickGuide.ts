import { request } from '@jetlinks-web/core'
import { countOf, recordOf, rowsOf, textOf } from '../shared/apiResult'
import type { HomeRow } from '../shared/types'
import { resourceRowAvailable } from '../shared/resources'

const collectSpaceIds = (rows: Record<string, unknown>[]): string[] => rows.flatMap(row => [
  textOf(row.id),
  ...collectSpaceIds(Array.isArray(row.children) ? row.children.map(recordOf) : []),
]).filter(Boolean)

/** 空间步骤需要已有空间且至少一条设备绑定；默认空空间树不算完成。 */
async function loadSpaceBindings(): Promise<number> {
  const tree = rowsOf(await request.post('/space/_query/tree', { paging: false }, { hiddenError: true }))
  const spaceIds = [...new Set(collectSpaceIds(tree))]
  if (!spaceIds.length) return 0
  return countOf(await request.post('/space/data-bind/_count', {
    terms: [{ column: 'spaceId', termType: 'in', value: spaceIds }],
  }, { hiddenError: true }))
}

/** 配置告警按视觉告警工作台的聚合任务判断，不以是否产生过告警作为完成条件。 */
export async function loadQuickGuideRows(): Promise<HomeRow[]> {
  const loaders: [string, () => Promise<number>][] = [
    ['space', loadSpaceBindings],
    ['alarm', async () => countOf(await request.post('/ai/aggregate/task/_count', {}, { hiddenError: true }))],
  ]
  // 单项失败只影响对应步骤，不能清空另一项已查到的配置状态。
  return Promise.all(loaders.filter(([id]) => resourceRowAvailable({ id })).map(async ([id, load]) => {
    try { return { id, value: await load() } } catch { return { id, failed: true } }
  }))
}
