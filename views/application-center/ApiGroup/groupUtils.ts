import type { ApiGroupWrite, GroupEnum, ManagedApiGroup, ManagedApiOperation, RawOpenApiSpec } from '@authentication-manager-ui/api/application-center/apiGroupManagement'
export const groupValue = <T extends string>(value?: GroupEnum<T> | null): T | undefined => typeof value === 'object' ? value?.value : value
export const groupText = <T extends string>(value: GroupEnum<T> | null | undefined, t: (key: string) => string, prefix: string) =>
  typeof value === 'object' && value?.text ? value.text : value ? t(prefix + groupValue(value)) : '-'
export const groupError = (cause: unknown, t: (key: string) => string) => {
  const error = cause as { response?: { data?: { message?: string } }; message?: string }
  const message = error?.response?.data?.message || error?.message || ''
  return message.startsWith('ApiGroupManagement.') ? t(message) : message || t('ApiGroupManagement.requestError')
}
export const validSpecPermission = (spec?: RawOpenApiSpec) => !!spec?.permissionId?.trim() && !!spec.actions?.length && spec.actions.every(action => !!action.trim())
const copyOptions = (value?: Record<string, unknown> | null) => value == null ? value : JSON.parse(JSON.stringify(value)) as Record<string, unknown>
export const copyOperations = (operations: ManagedApiOperation[] = []) => operations.map(operation => ({
  id: operation.id, name: operation.name, description: operation.description,
  apiSpecIds: [...(operation.apiSpecIds || [])], options: copyOptions(operation.options),
}))
export const newGroupDraft = (): ApiGroupWrite => ({ name: '', description: '', status: 'enabled', operations: [] })
export const groupDraft = (group: ManagedApiGroup): ApiGroupWrite => ({
  name: group.name, description: group.description, status: groupValue(group.status)!,
  operations: copyOperations(group.operations || []), options: copyOptions(group.options),
})
// 显式白名单：编辑保存不提交详情内 apiDetail、只读审计字段或接口文档。
export const groupPayload = (draft: ApiGroupWrite, stableIds: ReadonlySet<string>): ApiGroupWrite => ({
  name: draft.name.trim(), description: draft.description, status: draft.status,
  operations: copyOperations(draft.operations).map(operation => ({ ...operation, id: stableIds.has(operation.id) ? operation.id : operation.id.trim(), apiSpecIds: [...new Set(operation.apiSpecIds)] })),
  options: copyOptions(draft.options),
})
export const operationsChanged = (original: ManagedApiGroup, draft: ApiGroupWrite) => {
  const comparable = (operations: ManagedApiOperation[]) => operations.map(operation => ({ ...operation,
    apiSpecIds: [...operation.apiSpecIds].sort(),
  })).sort((a, b) => a.id.localeCompare(b.id))
  return JSON.stringify(comparable(copyOperations(original.operations || []))) !== JSON.stringify(comparable(copyOperations(draft.operations)))
}
