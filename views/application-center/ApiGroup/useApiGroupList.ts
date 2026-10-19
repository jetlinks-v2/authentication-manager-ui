import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import type { ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import type { QueryPayload } from '@authentication-manager-ui/api/application-center/apiApplication'
import { deleteManagedGroup, groupBody, queryManagedGroups, updateManagedGroup } from '@authentication-manager-ui/api/application-center/apiGroupManagement'
import type { ManagedApiGroup } from '@authentication-manager-ui/api/application-center/apiGroupManagement'
import { groupError, groupValue } from './groupUtils'
import { groupMenu, useGroupPermissions } from './useGroupPermissions'
export const useApiGroupList = () => {
  const { t } = useI18n()
  const menu = useMenuStore()
  const permissions = useGroupPermissions()
  const tableRef = ref<{ reload: () => void }>()
  const params = ref<QueryPayload>({ terms: [] })
  const error = ref('')
  const busyId = ref('')
  let disposed = false
  let querySequence = 0
  onBeforeUnmount(() => { disposed = true; querySequence++ })
  const columns = computed(() => [
    { title: t('ApiGroupManagement.name'), dataIndex: 'name', key: 'name', scopedSlots: true, width: 210,
      search: { type: 'string', defaultTermType: 'like' } },
    { title: t('ApiGroupManagement.groupId'), dataIndex: 'id', key: 'id', scopedSlots: true, width: 230 },
    { title: t('ApiGroupManagement.status'), dataIndex: 'status', key: 'status', scopedSlots: true, width: 100,
      search: { type: 'select', options: [{ label: t('ApiGroupManagement.state.enabled'), value: 'enabled' }, { label: t('ApiGroupManagement.state.disabled'), value: 'disabled' }] } },
    { title: t('ApiGroupManagement.description'), dataIndex: 'description', key: 'description', ellipsis: true },
    { title: t('ApiGroupManagement.operationCount'), key: 'operationCount', dataIndex: 'operationCount', scopedSlots: true, width: 100 },
    { title: t('ApiGroupManagement.actions'), key: 'action', dataIndex: 'action', scopedSlots: true, fixed: 'right' as const, width: 245 },
  ])
  const requestPage = async (query: QueryPayload) => {
    if (!permissions.canQuery.value) return
    const current = ++querySequence
    error.value = ''
    try {
      const response = await queryManagedGroups({ ...query, sorts: [{ name: 'createTime', order: 'desc' }] })
      if (!Array.isArray(groupBody(response).data)) throw new Error('ApiGroupManagement.invalidResponse')
      return response
    } catch (cause) { if (current === querySequence) error.value = groupError(cause, t); throw cause }
  }
  const handleSearch = ({ filter }: ConditionFilterChangePayload) => { params.value = { terms: filter.terms as QueryPayload['terms'] } }
  const refresh = () => { if (!disposed) tableRef.value?.reload() }
  const create = () => { if (permissions.canCreate.value) menu.jumpPage(groupMenu + '/Save', {}) }
  const open = (row: ManagedApiGroup) => { if (permissions.canQuery.value) menu.jumpPage(groupMenu + '/Save', { query: { id: row.id } }) }
  const mutate = async (row: ManagedApiGroup, request: () => Promise<unknown>) => {
    if (busyId.value) return
    busyId.value = row.id; error.value = ''
    try { await request(); if (!disposed) { onlyMessage(t('ApiGroupManagement.saved')); refresh() } }
    catch (cause) { if (!disposed) error.value = groupError(cause, t) }
    finally { if (!disposed) busyId.value = '' }
  }
  const toggle = (row: ManagedApiGroup) => {
    if (!permissions.canChangeStatus.value) return
    const status = groupValue(row.status) === 'enabled' ? 'disabled' : 'enabled'
    return mutate(row, () => updateManagedGroup(row.id, { status }))
  }
  const remove = (row: ManagedApiGroup) => { if (permissions.canDelete.value) return mutate(row, () => deleteManagedGroup(row.id)) }
  return { ...permissions, groupMenu, tableRef, params, columns, error, busyId, requestPage, handleSearch, refresh, create, open, toggle, remove }
}
