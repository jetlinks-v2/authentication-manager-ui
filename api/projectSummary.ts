import { getTreeData_api } from './system/department'
import { rowsOf, textOf } from '../visDashboard/Base/shared/apiResult'

/** 与组织管理使用相同排序，只显示当前用户可见组织树的第一个顶层名称。 */
export async function getOverviewOrganization(signal?: AbortSignal): Promise<string | undefined> {
  const response = await getTreeData_api({
    paging: false,
    sorts: [{ name: 'sortIndex', order: 'asc' }, { name: 'createTime', order: 'asc' }],
  }, { hiddenError: true, signal })
  return textOf(rowsOf(response)[0]?.name).trim() || undefined
}
