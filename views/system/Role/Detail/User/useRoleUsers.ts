import { computed, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import { onlyMessage } from '@jetlinks-web/utils'
import type { ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import { bindUser_api, getUserByRole_api, unbindUser_api } from '@authentication-manager-ui/api/system/role'
import { queryBusinessApplicationUsers } from '@authentication-manager-ui/api/application-center/businessApplication'
import type { QueryPayload, UserDetailEntity } from '@authentication-manager-ui/api/application-center/businessApplication'

export interface RoleUserTarget { roleId: string; applicationId?: string }

/** 范围条件放在用户筛选之外，OR 搜索不能放宽当前角色或应用的成员范围。 */
export function buildRoleUserQuery(target: RoleUserTarget, query: QueryPayload, candidates: boolean): QueryPayload {
  return {
    ...query,
    terms: [
      { column: candidates ? 'id$in-dimension$role$not' : 'id$in-dimension$role', value: target.roleId },
      ...(candidates ? [{ column: 'username', termType: 'not', value: 'admin' }] : []),
      ...(query.terms?.length ? [{ type: 'and', terms: query.terms }] : []),
    ],
  }
}

/** 已绑定列表与候选弹窗共用选择、查询及角色关系操作；应用用户必须来自该应用成员接口。 */
export function useRoleUsers(getTarget: () => RoleUserTarget, candidates = false, onSaved?: () => void) {
  const { t } = useI18n()
  const queryParams = ref<QueryPayload>({ terms: [] })
  const tableRef = ref<{ reload: () => void; dataSource?: UserDetailEntity[] }>()
  const selectedRowKeys = ref<string[]>([])
  const saving = ref(false)
  const loadError = ref(false)
  let sequence = 0
  let requestSequence = 0
  let disposed = false
  onScopeDispose(() => { disposed = true; sequence++; requestSequence++ })
  watch(() => [getTarget().roleId, getTarget().applicationId], () => {
    sequence++
    requestSequence++
    selectedRowKeys.value = []
    queryParams.value = { terms: [] }
    loadError.value = false
    tableRef.value?.dataSource?.splice(0)
  }, { flush: 'sync' })

  const columns = computed(() => [
    { title: t('User.index.667995-7'), dataIndex: 'name', key: 'name', ellipsis: true, search: { type: 'string' } },
    { title: t('User.index.667995-8'), dataIndex: 'username', key: 'username', ellipsis: true, search: { type: 'string' } },
    ...(!candidates ? [
      { title: t('User.index.667995-9'), dataIndex: 'createTime', key: 'createTime', scopedSlots: true, search: { type: 'date' } },
      { title: t('User.index.667995-10'), dataIndex: 'status', key: 'status', scopedSlots: true,
        search: { type: 'select', options: [{ label: t('User.index.667995-3'), value: 1 }, { label: t('User.index.667995-4'), value: 0 }] } },
      { title: t('User.index.667995-11'), dataIndex: 'action', key: 'action', scopedSlots: true, width: '12.5rem' },
    ] : []),
  ])
  const select = (rows: UserDetailEntity[], selected: boolean) => {
    const ids = new Set(selectedRowKeys.value)
    rows.forEach(row => selected ? ids.add(row.id) : ids.delete(row.id))
    selectedRowKeys.value = [...ids]
  }
  const rowSelection = computed(() => ({
    selectedRowKeys: selectedRowKeys.value,
    onSelect: (row: UserDetailEntity, selected: boolean) => select([row], selected),
    onSelectAll: (selected: boolean, _rows: UserDetailEntity[], changed: UserDetailEntity[]) => select(changed, selected),
    onSelectNone: () => { selectedRowKeys.value = [] },
  }))
  const search = ({ filter }: ConditionFilterChangePayload) => { queryParams.value = filter }
  const refresh = () => { selectedRowKeys.value = []; tableRef.value?.reload() }
  const requestUsers = async (params: QueryPayload) => {
    const current = ++requestSequence
    const target = { ...getTarget() }
    loadError.value = false
    try {
      const query = buildRoleUserQuery(target, params, candidates)
      const response = await (target.applicationId
        ? queryBusinessApplicationUsers(target.applicationId, query)
        : getUserByRole_api(query))
      if (response.success === false) throw new Error('Role users unavailable')
      return response
    } catch (error) {
      if (!disposed && current === requestSequence) loadError.value = true
      throw error
    }
  }
  const save = async (ids = selectedRowKeys.value) => {
    if (disposed || saving.value || loadError.value) return
    if (!ids.length) { onlyMessage(t('User.index.667995-12'), 'warning'); return }
    const current = sequence
    const { roleId } = getTarget()
    // 固定角色和用户集合；请求期间切换或关闭页面后不刷新新范围，也不影响应用成员关系。
    const userIds = [...ids]
    saving.value = true
    try {
      const response = await (candidates ? bindUser_api(roleId, userIds) : unbindUser_api(roleId, userIds))
      if (disposed || current !== sequence) return
      if (response.success === false) { onlyMessage(t('Role.users.saveFailed'), 'error'); return }
      onlyMessage(t('User.index.667995-13'))
      refresh()
      onSaved?.()
    } finally { saving.value = false }
  }
  const formatTime = (time?: string | number) => time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : t('comm.table.empty-2')
  const isEnabled = (status: UserDetailEntity['status']) => Number(typeof status === 'object' ? status.value : status) === 1
  return { columns, queryParams, tableRef, rowSelection, selectedRowKeys, saving, loadError, requestUsers, search, refresh, save, formatTime, isEnabled }
}
