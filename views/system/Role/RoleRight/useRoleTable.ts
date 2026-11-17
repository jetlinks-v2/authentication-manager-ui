import { computed, onScopeDispose, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { useTabSaveSuccessBack } from '@jetlinks-web-core/hooks'
import type { ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import { getRoleList_api, delRole_api } from '@authentication-manager-ui/api/system/role'
import { getApplicationTemplate } from '@authentication-manager-ui/api/application-center/applicationTemplate'
import type { BusinessApplicationRoleEntity, BusinessApplicationTemplateEntity, QueryPayload } from '@authentication-manager-ui/api/application-center/businessApplication'
import type { ApplicationRoleScope } from '@authentication-manager-ui/components/ApplicationRolePermissions/useApplicationRolePermissions'
import { buildRoleQuery, roleScopeKey } from '../roleScope'
import type { RoleScope } from '../roleScope'
import type { RoleFormContext } from './components/useRoleForm'

interface RoleTableAction {
  id: string
  key: string
  text: string
  icon: string
  common: boolean
  disabled?: boolean
  onClick?: () => void
  popConfirm?: { title: string; onConfirm: () => Promise<void> }
}

/** 角色列表的范围、搜索与操作编排；分页和列表请求竞态沿用 ProTable 的生命周期。 */
export function useRoleTable(props: { scope: RoleScope }) {
  const { t } = useI18n()
  const route = useRoute()
  const { jumpPage } = useMenuStore()
  const { onBack } = useTabSaveSuccessBack()
  const filter = ref<QueryPayload>({ terms: [] })
  const queryParams = computed(() => buildRoleQuery(props.scope, filter.value))
  const emptyCreateSearch = computed(() => Boolean(filter.value.terms?.length))
  const tableRef = ref<{ reload: () => void; dataSource?: BusinessApplicationRoleEntity[] }>()
  const tableError = ref(false)
  const dialog = ref<RoleFormContext>()
  const copy = reactive<{ visible: boolean; data?: BusinessApplicationRoleEntity }>({ visible: false })
  const template = ref<BusinessApplicationTemplateEntity>()
  const templateLoading = ref(false)
  const templateError = ref(false)
  let templateSequence = 0
  let disposed = false
  onScopeDispose(() => { disposed = true; templateSequence++ })
  const applicationScope = computed<ApplicationRoleScope | undefined>(() => props.scope.kind === 'application' && template.value
    ? { applicationId: props.scope.application.id, templateId: template.value.id, isExternal: template.value.provider === 'third-party' }
    : undefined)

  const loadTemplate = async () => {
    const sequence = ++templateSequence
    template.value = undefined
    templateError.value = false
    templateLoading.value = false
    const scope = props.scope
    if (scope.kind !== 'application') return
    templateLoading.value = true
    try {
      const response = await getApplicationTemplate(scope.application.templateId)
      if (response.success === false || !response.result?.id) throw new Error(response.message)
      if (sequence === templateSequence) template.value = response.result
    } catch {
      if (sequence === templateSequence) templateError.value = true
    } finally {
      if (sequence === templateSequence) templateLoading.value = false
    }
  }

  const requestRoles = async (params: QueryPayload, config?: { signal?: AbortSignal }) => {
    tableError.value = false
    const response = await getRoleList_api(params, config)
    if (response.success === false) throw new Error(response.message)
    return response
  }
  const search = ({ filter: nextFilter }: ConditionFilterChangePayload) => { filter.value = nextFilter }
  const addRole = () => { dialog.value = { scope: props.scope, mode: 'add' } }
  const editRole = (role: BusinessApplicationRoleEntity) => { dialog.value = { scope: props.scope, mode: 'edit', current: role } }
  const configureRole = (role: BusinessApplicationRoleEntity) => {
    if (props.scope.kind === 'application' && (!applicationScope.value || applicationScope.value.isExternal)) return
    jumpPage('system/Role/Detail', { params: { id: role.id } })
  }
  const onSave = (id: string) => {
    const context = dialog.value
    dialog.value = undefined
    if (!context) return
    if (context.scope.kind === 'application' || context.mode === 'edit') tableRef.value?.reload()
    else if (route.query.save) onBack(id)
    else jumpPage('system/Role/Detail', { params: { id } })
  }
  const onCopySave = (id: string) => {
    copy.visible = false
    tableRef.value?.reload()
    jumpPage('system/Role/Detail', { params: { id } })
  }
  const removeRole = async (role: BusinessApplicationRoleEntity) => {
    const scopeKey = roleScopeKey(props.scope)
    const response = await delRole_api(role.id)
    if (response.success === false) { onlyMessage(t('RoleRight.index.470525-10'), 'error'); return }
    if (disposed || scopeKey !== roleScopeKey(props.scope)) return
    onlyMessage(t('RoleRight.index.470525-9'))
    tableRef.value?.reload()
  }

  const columns = computed(() => [
    { title: t('RoleRight.index.470525-1'), dataIndex: 'id', key: 'id', ellipsis: true, fixed: 'left', search: { type: 'string' } },
    { title: t('RoleRight.index.470525-2'), dataIndex: 'name', key: 'name', ellipsis: true, search: { type: 'string' } },
    { title: t('RoleRight.index.470525-3'), dataIndex: 'description', key: 'description', ellipsis: true,
      search: { type: 'string' }, columnEmpty: t('comm.table.empty') },
    { title: t('RoleRight.index.470525-4'), dataIndex: 'action', key: 'action', width: 120, fixed: 'right', scopedSlots: true },
  ])
  const getActions = (role: BusinessApplicationRoleEntity): RoleTableAction[] => [
    { id: 'edit', key: 'update', text: t('RoleRight.index.470525-5'), icon: 'EditOutlined', common: true, onClick: () => editRole(role) },
    ...(!applicationScope.value?.isExternal ? [{ id: 'grant', key: 'update', text: t('RoleRight.index.470525-6'),
      icon: 'FormOutlined', common: true, disabled: props.scope.kind === 'application' && (!applicationScope.value || templateLoading.value),
      onClick: () => configureRole(role) }] : []),
    ...(props.scope.kind !== 'application' ? [{ id: 'copy', key: 'copy', text: t('RoleRight.index.470525-11'), icon: 'CopyOutlined',
      common: false, onClick: () => { copy.data = role; copy.visible = true } }] : []),
    { id: 'delete', key: 'delete', text: t('RoleRight.index.470525-7'), icon: 'DeleteOutlined', common: false,
      popConfirm: { title: t('RoleRight.index.470525-8'), onConfirm: () => removeRole(role) } },
  ]

  // 搜索值留在当前表格，范围变化由 params 驱动回到第一页；旧弹窗同时销毁，防止跨应用提交。
  watch(() => roleScopeKey(props.scope), () => {
    dialog.value = undefined
    copy.visible = false
    tableError.value = false
    // ProTable 失败时保留旧行；跨范围时先清空，避免新请求失败仍展示上一应用的角色。
    tableRef.value?.dataSource?.splice(0)
    void loadTemplate()
  }, { immediate: true, flush: 'sync' })
  if (route.query.save) addRole()
  return { queryParams, emptyCreateSearch, tableRef, tableError, dialog, copy,
    templateError, templateLoading, applicationScope, loadTemplate, requestRoles,
    search, addRole, onSave, onCopySave, columns, getActions }
}
