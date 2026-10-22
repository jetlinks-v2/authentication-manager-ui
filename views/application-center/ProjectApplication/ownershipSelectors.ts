import { getTreeData_api } from '../../../api/system/department'
import { getUserList_api } from '../../../api/system/user'
import OwnershipOrganizationTree from './OwnershipOrganizationTree.vue'
import type { ConditionClause } from '@jetlinks-web-core/components/ConditionFilter'
import type { AssetDimensionFilter, AssetDimensionOption, AssetDimensionSelector } from '@jetlinks-web-core/components/AssetOwnershipCondition'

interface OrganizationNode {
  id: string
  name: string
  children?: OrganizationNode[]
}

const toOptions = (nodes: OrganizationNode[]): AssetDimensionOption[] => nodes.map(node => ({
  value: node.id,
  label: node.name,
  children: node.children?.length ? toOptions(node.children) : undefined,
}))

interface CreatorUser {
  id: string
  name?: string
  username?: string
}

/** Context 决定是否开放目录；适配器只按需查询，最终权限由用户接口执行。 */
export const createOwnershipCreatorSelector = (): AssetDimensionSelector => {
  const queryUsers = async (params: {
    paging?: boolean; pageIndex?: number; pageSize?: number; terms: ConditionClause[]
  }): Promise<AssetDimensionOption[]> => {
    const response = await getUserList_api({ ...params, sorts: [{ name: 'name', order: 'asc' }, { name: 'id', order: 'asc' }] })
    if (!response.success || !Array.isArray(response.result?.data)) throw new Error('User query failed')
    return (response.result.data as CreatorUser[]).map(user => {
      const username = user.username || ''
      const suffixIndex = username.lastIndexOf('@')
      const displayUsername = suffixIndex < 0 ? username : username.slice(0, suffixIndex)
      return {
        value: user.id,
        label: user.name && displayUsername ? `${user.name} (${displayUsername})` : user.name || displayUsername || user.id,
      }
    })
  }
  return {
    optionPanel: {
      loadOptions: (keyword, page) => queryUsers({
        pageIndex: page?.pageIndex ?? 0,
        pageSize: page?.pageSize ?? 20,
        terms: keyword ? [
          { column: 'name', termType: 'like', value: `%${keyword}%` },
          { column: 'username', termType: 'like', value: `%${keyword}%`, type: 'or' },
        ] : [],
      }),
      loadSelectedOptions: ids => ids?.length
        ? queryUsers({ paging: false, terms: [{ column: 'id', termType: 'in', value: ids }] })
        : Promise.resolve([]),
    },
  }
}

/** 完整可见树只在打开组织选择时加载，搜索在树内保留祖先路径。 */
export const createOwnershipOrganizationSelector = (): AssetDimensionSelector => {
  return {
    component: OwnershipOrganizationTree,
    optionPanel: {
      loadOptions: async () => {
        const response = await getTreeData_api({ paging: false, terms: [] })
        if (!response.success || !Array.isArray(response.result)) throw new Error('Organization query failed')
        return toOptions(response.result as OrganizationNode[])
      },
    },
  }
}

/** 由模块统一注册维度能力；创建选择器和加载目录均由用户交互触发。 */
export const ownershipDimensionFilters: Record<string, AssetDimensionFilter> = {
  org: {
    icon: 'ApartmentOutlined',
    getOperators: () => ['targets', 'notTargets', 'bound', 'unbound'],
    supportsClosure: true,
    createSelector: createOwnershipOrganizationSelector,
  },
  tenant: {
    icon: 'TeamOutlined',
    getOperators: () => ['targets', 'notTargets', 'bound', 'unbound'],
    allowIdInput: true,
  },
}
