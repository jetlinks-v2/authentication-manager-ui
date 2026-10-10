import type { ApiGroup, ApiGroupGrant } from '@authentication-manager-ui/api/application-center/apiApplication'

export const selectedGroupOperations = (grants: ApiGroupGrant[]) => grants.reduce<Record<string, string[]>>((selected, grant) => {
  selected[grant.groupId] = [...new Set([...(selected[grant.groupId] || []), ...(grant.operationIds || [])])]
  return selected
}, {})

// 同一分组可有多条资产范围；只应用操作增删，保留所有范围，整个分组撤销由上层处理。
export const updateGroupGrantOperations = (grants: ApiGroupGrant[], selected: string[]): ApiGroupGrant[] => {
  const previous = new Set(grants.flatMap(grant => grant.operationIds || []))
  const added = selected.filter(id => !previous.has(id))
  return grants.map(grant => ({ ...grant,
    operationIds: [...new Set([...(grant.operationIds || []).filter(id => selected.includes(id)), ...added])],
  }))
}

export const newBusinessApplicationGrants = (group: ApiGroup, targetId: string, operationIds: string[]): ApiGroupGrant[] => {
  const base: ApiGroupGrant = { targetType: 'api-client', targetId, groupId: group.id, operationIds }
  // 仅沿用 API 应用创建入口原有的业务应用范围语义，不猜测资产类型或增加其他数据范围。
  return group.assetTypes.length ? group.assetTypes.map(assetType => ({ ...base,
    assetAccesses: { assetType, accesses: [{ supportId: 'business_application' }] },
  })) : [base]
}
