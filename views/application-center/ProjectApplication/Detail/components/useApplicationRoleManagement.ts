import { computed, onScopeDispose, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useMenuAssetPermissionEditor } from '@jetlinks-web-core/hooks'
import type { AssetAccessPolicy, AssetTypeName, MenuPermissionNode } from '@jetlinks-web-core/hooks'
import { isNoCommunity } from '@jetlinks-web-core/utils/utils'
import { getAssetsType as queryAssetTypes } from '@authentication-manager-ui/api/system/menu'
import {
  normalizeAssetTypeNames,
  normalizeGrantableAssets,
  unwrapResult,
} from '../../../Template/Save/menu-config.shared'
import {
  buildApplicationRoleMenuQuery,
  buildApplicationRolePermissionGrant,
  resolveApplicationRoleMenuCandidates,
  resolveApplicationRolePermissionScope,
} from '../../applicationRolePermissionScope'
import type { ApplicationRolePermissionScopeInput } from '../../applicationRolePermissionScope'
import type { ApplicationRole, ApplicationRoleDraft, ApplicationUser } from '../../types'
import {
  getBusinessApplicationTemplateMenus,
  getBusinessApplicationRoleMenuGrantDetail,
  saveBusinessApplicationRoleMenuGrant,
} from '@authentication-manager-ui/api/application-center/businessApplication'
import { getCurrentUserMenuTree, getGrantableAssetAccesses } from '@authentication-manager-ui/api/application-center/applicationTemplate'

interface GrantDetail {
  menus?: MenuPermissionNode[]
  assetAccesses?: AssetAccessPolicy[]
}

export interface ApplicationRoleScope { applicationId: string; templateId: string; isExternal: boolean }

/**
 * 管理应用内角色及其授权编辑器。
 *
 * 菜单及资产策略均受模板和操作者可授权范围限制；保存前再次读取，避免提交过期策略。
 */
export function useApplicationRoleManagement(
  props: { roles: ApplicationRole[]; users: ApplicationUser[]; scope: ApplicationRoleScope },
  saveRole: (draft: ApplicationRoleDraft, id?: string) => void
) {
  const { t: $t } = useI18n()
  const activeRoleId = ref('')
  const roleModalOpen = ref(false)
  const editingRoleId = ref<string>()
  const formRef = ref()
  const form = reactive<ApplicationRoleDraft>({ name: '', description: '' })
  const permissionLoading = ref(false)
  const permissionError = ref(false)
  const savingPermissions = ref(false)
  const initialized = ref(false)
  const excludedMenus = ref<Pick<MenuPermissionNode, 'id' | 'name' | 'i18nName'>[]>([])
  const excludedMenuNames = computed(() => excludedMenus.value.map(menu => menu.i18nName || menu.name || menu.id).join(', '))
  const editor = useMenuAssetPermissionEditor({ defaultSupportIds: ['creator'] })

  const activeRole = computed(() => props.roles.find(item => item.id === activeRoleId.value))
  const memberCount = (roleId: string) => props.users.filter(user => user.roleId === roleId).length
  const columns = computed(() => [
    { title: $t('ProjectApplication.role.menu'), dataIndex: 'menu', key: 'menu', width: '38%' },
    { title: $t('ProjectApplication.role.operationPermissions'), dataIndex: 'action', key: 'action' },
  ])
  const rules = computed(() => ({ name: [{ required: true, message: $t('ProjectApplication.role.nameRequired') }] }))
  let loadSequence = 0
  let disposed = false
  let loadedAssetTypes: AssetTypeName[] = []
  let loadedRoleMenus: MenuPermissionNode[] = []
  onScopeDispose(() => { disposed = true; loadSequence++ })

  const clearPermissions = () => {
    initialized.value = false
    permissionLoading.value = false
    loadedRoleMenus = []
    excludedMenus.value = []
    editor.reset({ menus: [], assetTypes: [] })
  }

  const assertSuccess = <T,>(response: any, fallback: T): T => {
    if (response?.success === false) throw new Error(response.message)
    return unwrapResult(response, fallback)
  }

  const loadAssetTypes = async (): Promise<AssetTypeName[]> => {
    if (!isNoCommunity) return []
    const response = await queryAssetTypes()
    if (response?.success === false) throw new Error(response.message)
    return normalizeAssetTypeNames(response)
  }

  /** 可授权范围必须来自独立接口；空菜单跳过请求，空响应保持显式无权限。 */
  const loadPermissionScope = async (input: Omit<ApplicationRolePermissionScopeInput, 'grantableAssets'>) => {
    const menus = resolveApplicationRoleMenuCandidates(input).filter(menu => menu.granted)
    const response = menus.length ? await getGrantableAssetAccesses(menus) : []
    assertSuccess(response, [])
    return resolveApplicationRolePermissionScope({ ...input, grantableAssets: normalizeGrantableAssets(response) })
  }

  const loadPermissions = async () => {
    const sequence = ++loadSequence
    if (props.scope.isExternal || !activeRoleId.value || !props.scope.applicationId || !props.scope.templateId) {
      clearPermissions()
      return
    }
    initialized.value = false
    permissionLoading.value = true
    permissionError.value = false
    excludedMenus.value = []
    try {
      const [templateResponse, userMenuResponse, detailResponse, assetTypes] = await Promise.all([
        getBusinessApplicationTemplateMenus(props.scope.templateId),
        getCurrentUserMenuTree(buildApplicationRoleMenuQuery(props.scope.isExternal)),
        getBusinessApplicationRoleMenuGrantDetail(props.scope.applicationId, activeRoleId.value),
        loadAssetTypes(),
      ])
      if (sequence !== loadSequence) return

      const templateDetail = assertSuccess<GrantDetail>(templateResponse, {})
      const roleDetail = assertSuccess<GrantDetail>(detailResponse, {})
      const roleMenus = Array.isArray(roleDetail.menus) ? roleDetail.menus : []
      const permissionScope = await loadPermissionScope({
        isExternal: props.scope.isExternal,
        currentUserMenus: assertSuccess<MenuPermissionNode[]>(userMenuResponse, []),
        templateMenus: templateDetail.menus,
        roleMenus,
        templateAssetAccesses: templateDetail.assetAccesses,
      })
      if (sequence !== loadSequence) return

      loadedAssetTypes = assetTypes
      // 保存原始绑定，首次加载就被排除的菜单也必须携带 owner 撤销标记。
      loadedRoleMenus = roleMenus
      excludedMenus.value = permissionScope.excludedMenus
      editor.reset({ ...permissionScope, assetTypes })
      initialized.value = true
    } catch {
      if (sequence === loadSequence) { clearPermissions(); permissionError.value = true }
    } finally {
      if (sequence === loadSequence) permissionLoading.value = false
    }
  }

  watch(() => props.roles, roles => {
    if (!roles.some(item => item.id === activeRoleId.value)) activeRoleId.value = roles[0]?.id || ''
  }, { immediate: true, deep: true })
  watch([
    activeRoleId,
    () => props.scope.applicationId,
    () => props.scope.templateId,
    () => props.scope.isExternal,
  ], loadPermissions, { immediate: true, deep: true })

  const savePermissions = async () => {
    if (disposed || props.scope.isExternal || !initialized.value || !activeRoleId.value || savingPermissions.value) return
    const scope = { ...props.scope }
    const roleId = activeRoleId.value
    const roleName = activeRole.value?.name || ''
    const sequence = loadSequence
    const draft = editor.getSnapshot()
    const previousMenus = [...loadedRoleMenus, ...editor.flatMenus.value]
    // 请求期间切换角色、应用或卸载后，不把旧草稿写给新目标，也不覆盖新角色的回显。
    const isCurrent = () => !disposed && sequence === loadSequence && roleId === activeRoleId.value
      && scope.applicationId === props.scope.applicationId && scope.templateId === props.scope.templateId
      && scope.isExternal === props.scope.isExternal
    savingPermissions.value = true
    try {
      const [templateResponse, userMenuResponse] = await Promise.all([
        getBusinessApplicationTemplateMenus(scope.templateId),
        getCurrentUserMenuTree(buildApplicationRoleMenuQuery(scope.isExternal)),
      ])
      if (!isCurrent()) return
      const template = assertSuccess<GrantDetail>(templateResponse, {})
      const permissionScope = await loadPermissionScope({
        isExternal: scope.isExternal,
        currentUserMenus: assertSuccess<MenuPermissionNode[]>(userMenuResponse, []),
        templateMenus: template.menus,
        templateAssetAccesses: template.assetAccesses,
        roleMenus: draft.menus,
      })
      if (!isCurrent()) return
      excludedMenus.value = permissionScope.excludedMenus
      editor.reset({ ...permissionScope, assetTypes: loadedAssetTypes })
      const payload = buildApplicationRolePermissionGrant(editor.getSnapshot(), permissionScope, previousMenus)
      const response = await saveBusinessApplicationRoleMenuGrant(
        scope.applicationId, roleId, payload,
      )
      assertSuccess(response, undefined)
      if (!isCurrent()) return
      onlyMessage($t('ProjectApplication.role.permissionSuccess', { name: roleName }))
      await loadPermissions()
    } catch {
      // The shared request layer reports the backend error.
    } finally {
      savingPermissions.value = false
    }
  }

  const openRole = (role?: ApplicationRole) => {
    editingRoleId.value = role?.id
    Object.assign(form, { name: role?.name || '', description: role?.description || '' })
    roleModalOpen.value = true
  }

  const confirmRole = async () => {
    try {
      await formRef.value?.validate()
    } catch {
      return
    }
    saveRole({ ...form }, editingRoleId.value)
    roleModalOpen.value = false
  }

  return { activeRoleId, roleModalOpen, editingRoleId, formRef, form, permissionLoading, permissionError,
    savingPermissions, initialized, excludedMenuNames, editor, activeRole, memberCount, columns, rules, savePermissions,
    openRole, confirmRole, loadPermissions }
}
