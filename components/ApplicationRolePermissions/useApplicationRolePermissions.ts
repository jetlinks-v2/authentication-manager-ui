import { computed, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { getFixedNotificationMenus, isFixedNotificationAsset, useMenuAssetPermissionEditor } from '@jetlinks-web-core/hooks'
import type { AssetAccessPolicy, AssetTypeName, GrantableAssetType, MenuPermissionNode } from '@jetlinks-web-core/hooks'
import { isNoCommunity } from '@jetlinks-web-core/utils/utils'
import { getAssetsType as queryAssetTypes } from '@authentication-manager-ui/api/system/menu'
import {
  normalizeAssetTypeNames,
  normalizeGrantableAssets,
  unwrapResult,
} from '../../views/application-center/Template/Save/menu-config.shared'
import {
  buildApplicationRoleMenuQuery,
  buildApplicationRolePermissionGrant,
  type ApplicationRolePermissionMode,
  getApplicationRoleMenuCandidates,
  intersectRoleAssetPolicies,
  previousRoleBindings,
  resolveApplicationRolePermissionScope,
} from '../../views/application-center/ProjectApplication/applicationRolePermissionScope'
import type { BusinessApplicationRoleEntity } from '@authentication-manager-ui/api/application-center/businessApplication'
import {
  getBusinessApplicationTemplateMenus,
  getBusinessApplicationMenus,
  getBusinessApplicationRoleMenuGrantDetail,
  saveBusinessApplicationRoleMenuGrant,
} from '@authentication-manager-ui/api/application-center/businessApplication'
import { getCurrentUserMenuTree, getGrantableAssetAccesses } from '@authentication-manager-ui/api/application-center/applicationTemplate'
import { matchesMenuOnlyWrite, menuOnlyBaseline, readRoleMenuBindings } from '../../views/application-center/ProjectApplication/menuOnlyRoleGrant'

type RoleBindings = Awaited<ReturnType<typeof readRoleMenuBindings>>

interface GrantDetail {
  menus?: MenuPermissionNode[]
  assetAccesses?: AssetAccessPolicy[]
}

export interface ApplicationRoleScope { applicationId: string; templateId: string; isExternal: boolean }
export interface ApplicationRolePermissionTarget {
  scope: ApplicationRoleScope
  role?: Pick<BusinessApplicationRoleEntity, 'id' | 'name'>
}

const inheritedFixedGrantable = (
  menus: MenuPermissionNode[], policies: AssetAccessPolicy[], definitions: GrantableAssetType[],
) => getFixedNotificationMenus(menus).length ? definitions.map(asset => ({
  ...asset,
  accesses: asset.accesses.filter(access => policies.some(policy => policy.assetType === asset.assetType
    && policy.accesses.some(item => item.supportId === access.supportId))),
})) : []

/** 应用详情与系统角色权限页共用授权边界；保存前刷新应用及模板，切换目标后忽略过期请求。 */
export function useApplicationRolePermissions(
  target: () => ApplicationRolePermissionTarget, mode: ApplicationRolePermissionMode = 'with-assets',
) {
  const menusOnly = mode === 'menus-only'
  const { t: $t } = useI18n()
  const permissionLoading = ref(false)
  const permissionError = ref(false)
  const savingPermissions = ref(false)
  const initialized = ref(false)
  const inheritedAssetAccesses = ref<AssetAccessPolicy[]>([])
  const blockedMenuNames = ref<string[]>([])
  const refreshError = ref(false)
  const menuSaveWarning = ref('')
  let baseline: ReturnType<typeof menuOnlyBaseline> | undefined
  let savedRoleMenus: MenuPermissionNode[] = []
  const savedFixedPolicies = ref<AssetAccessPolicy[]>([])
  const assetDefinitions = ref<GrantableAssetType[]>([])
  const sharedEditor = useMenuAssetPermissionEditor({ defaultSupportIds: ['creator'] })
  // 本页只有一份菜单/按钮交集。分组编辑器可保留“只授菜单、没有按钮”的原绑定；
  // 在本页也将这种授权显示为勾选，避免误以为已撤销。不改变系统权限页的分组或展示。
  const showExplicitGrants = (rows: MenuPermissionNode[]): MenuPermissionNode[] => rows.map(row => ({
    ...row, _granted: row._granted || (!!row.granted && !row.indeterminate),
    children: row.children?.length ? showExplicitGrants(row.children) : null,
  }))
  const editor = menusOnly ? { ...sharedEditor, showMenuGroups: computed(() => false),
    ownerGroups: computed(() => sharedEditor.ownerGroups.value.map(group => ({ ...group, menus: showExplicitGrants(group.menus) }))),
  } : sharedEditor
  // 展示有效上限，避免共享编辑器的默认 creator 草稿被误认为继承的数据权限。
  const inheritedAssetOptions = computed(() => Object.fromEntries(editor.visibleAssets.value.map(asset => [
    asset.assetType,
    (inheritedAssetAccesses.value.find(policy => policy.assetType === asset.assetType)?.accesses || []).map(access => {
      const definition = assetDefinitions.value.find(item => item.assetType === asset.assetType)?.accesses
        .find(option => option.supportId === access.supportId) || asset.accesses.find(option => option.supportId === access.supportId)
      const label = definition?.i18nName || definition?.name || access.supportId
      return { value: access.supportId, label: label === 'business_application' ? $t('Role.application.applicationData') : label }
    }),
  ])))

  const columns = computed(() => [
    { title: $t('ProjectApplication.role.menu'), dataIndex: 'menu', key: 'menu', width: '38%' },
    { title: $t('ProjectApplication.role.operationPermissions'), dataIndex: 'action', key: 'action' },
  ])
  let loadSequence = 0
  let disposed = false
  let loadedAssetTypes: AssetTypeName[] = []
  onScopeDispose(() => { disposed = true; loadSequence++ })

  const clearPermissions = () => {
    initialized.value = false
    permissionLoading.value = false
    inheritedAssetAccesses.value = []
    savedRoleMenus = []
    baseline = undefined
    menuSaveWarning.value = ''
    blockedMenuNames.value = []
    refreshError.value = false
    savedFixedPolicies.value = []
    assetDefinitions.value = []
    editor.reset({ menus: [], assetTypes: [] })
  }

  const assertSuccess = <T,>(response: unknown, fallback: T): T => {
    const result = response as { success?: boolean; message?: string } | undefined
    if (result?.success === false) throw new Error(result.message)
    return unwrapResult(response, fallback)
  }

  const loadAssetTypes = async (): Promise<AssetTypeName[]> => {
    if (menusOnly || !isNoCommunity) return []
    const response = await queryAssetTypes()
    if (response?.success === false) throw new Error(response.message)
    return normalizeAssetTypeNames(response)
  }

  const readRoleDetail = async (applicationId: string, roleId: string, confirmed?: RoleBindings): Promise<{
    menus: MenuPermissionNode[]; assetAccesses?: AssetAccessPolicy[]; bindings?: RoleBindings
  }> => {
    if (menusOnly) {
      // 实际关系用于回显和写前核对；没有额外查询权限时仍可读应用内详情，但不能把它当作写入依据。
      const bindings = confirmed ?? await readRoleMenuBindings(applicationId, roleId).catch(() => undefined)
      if (bindings) return { bindings, menus: bindings.map(b => ({ id: b.menuId, granted: true, buttons: b.buttons })) }
    }
    const response = await getBusinessApplicationRoleMenuGrantDetail(applicationId, roleId)
    const detail = assertSuccess<GrantDetail>(response, {})
    if (!Array.isArray(detail.menus)) throw new Error('Role menus unavailable')
    return { menus: detail.menus, assetAccesses: detail.assetAccesses }
  }

  // 两个入口均刷新菜单/按钮上限；只有权限配置页读取赋权人的资产目录。
  const readScope = async (scope: ApplicationRoleScope) => {
    const [templateResponse, userResponse, applicationResponse] = await Promise.all([
      getBusinessApplicationTemplateMenus(scope.templateId),
      getCurrentUserMenuTree(buildApplicationRoleMenuQuery(scope.isExternal)),
      getBusinessApplicationMenus(scope.applicationId),
    ])
    const template = assertSuccess<GrantDetail>(templateResponse, {})
    const application = assertSuccess<GrantDetail>(applicationResponse, {})
    const currentUserMenus = assertSuccess<MenuPermissionNode[] | null>(userResponse, null)
    if (!Array.isArray(application.menus) || !Array.isArray(template.menus) || !Array.isArray(currentUserMenus)) {
      throw new Error('Application role grant scope unavailable')
    }
    const candidates = getApplicationRoleMenuCandidates({ isExternal: scope.isExternal, currentUserMenus,
      templateMenus: template.menus, applicationMenus: application.menus })
    if (menusOnly) return { isExternal: scope.isExternal, candidates, definitions: [], effectiveAssetAccesses: [] }
    if (!Array.isArray(application.assetAccesses) || !application.assetAccesses.every(policy => policy?.assetType
      && Array.isArray(policy.accesses) && policy.accesses.every(access => typeof access?.supportId === 'string' && access.supportId))) {
      throw new Error('Application role asset scope unavailable')
    }
    const eligible = candidates.filter(menu => menu.granted && Array.isArray(menu.assetTypes) && menu.assetTypes.length)
    const catalog = eligible.length ? assertSuccess<GrantableAssetType[] | null>(await getGrantableAssetAccesses(eligible), null) : []
    if (!Array.isArray(catalog) || !catalog.every(asset => typeof asset?.assetType === 'string' && asset.assetType
      && Array.isArray(asset.accesses) && asset.accesses.every(access => typeof access?.supportId === 'string' && access.supportId))) {
      throw new Error('Grantable asset scopes unavailable')
    }
    const definitions = normalizeGrantableAssets(catalog)
    return { isExternal: scope.isExternal, candidates, definitions,
      effectiveAssetAccesses: intersectRoleAssetPolicies(eligible, application.assetAccesses, definitions) }
  }

  const resetEditor = (bounds: Awaited<ReturnType<typeof readScope>>, roleMenus: MenuPermissionNode[]) => {
    const scope = resolveApplicationRolePermissionScope({ ...bounds, roleMenus }, mode)
    blockedMenuNames.value = scope.blockedMenuNames
    refreshError.value = false
    if (menusOnly) {
      const menus = bounds.candidates.filter(menu => menu.granted)
        .map(menu => ({ id: menu.id, buttonIds: (menu.buttons || []).map(button => button.id) }))
      editor.reset({ menus: scope.menus, grantedMenus: scope.grantedMenus, menuGroups: [{ key: 'app', label: 'app', menus }] })
    } else {
      assetDefinitions.value = bounds.definitions
      inheritedAssetAccesses.value = scope.assetAccesses
      editor.reset({ ...scope, assetTypes: loadedAssetTypes,
        assetAccesses: [...scope.assetAccesses.filter(policy => !isFixedNotificationAsset(policy.assetType)), ...savedFixedPolicies.value],
        fixedAssetGrantable: inheritedFixedGrantable(scope.menus, scope.assetAccesses, bounds.definitions),
      })
    }
    return scope
  }

  const refreshPermissions = async (confirmed?: RoleBindings) => {
    const sequence = ++loadSequence
    const { scope, role } = target()
    if (scope.isExternal || !role?.id || !scope.applicationId || !scope.templateId) {
      clearPermissions()
      return
    }
    initialized.value = false
    permissionLoading.value = true
    permissionError.value = false
    menuSaveWarning.value = ''
    baseline = undefined
    try {
      const [roleDetail, assetTypes, bounds] = await Promise.all([
        readRoleDetail(scope.applicationId, role.id, confirmed), loadAssetTypes(), readScope(scope),
      ])
      if (sequence !== loadSequence) return
      loadedAssetTypes = assetTypes
      if (!menusOnly) {
        savedRoleMenus = previousRoleBindings(roleDetail.menus)
        savedFixedPolicies.value = (roleDetail.assetAccesses || []).filter(policy => isFixedNotificationAsset(policy.assetType))
      }
      resetEditor(bounds, roleDetail.menus)
      if (menusOnly) {
        baseline = menuOnlyBaseline(bounds.candidates, editor.getSnapshot().menus, roleDetail.bindings)
        if (!roleDetail.bindings) menuSaveWarning.value = 'menuBindingsUnavailable'
      }
      initialized.value = true
    } catch {
      if (sequence === loadSequence) { clearPermissions(); permissionError.value = true }
    } finally {
      if (sequence === loadSequence) permissionLoading.value = false
    }
  }

  const loadPermissions = () => refreshPermissions()

  watch([
    () => target().role?.id,
    () => target().scope.applicationId,
    () => target().scope.templateId,
    () => target().scope.isExternal,
  ], loadPermissions, { immediate: true, deep: true })

  const savePermissions = async () => {
    const { scope: currentScope, role } = target()
    if (disposed || currentScope.isExternal || !initialized.value || !role?.id || savingPermissions.value) return
    const scope = { ...currentScope }
    const roleId = role.id
    const roleName = role.name
    const sequence = loadSequence
    const draft = editor.getSnapshot()
    if (menusOnly && (!baseline || !baseline.changed(draft.menus))) {
      if (baseline?.verified) menuSaveWarning.value = ''
      return
    }
    const previousMenus = [...savedRoleMenus, ...editor.flatMenus.value]
    // 请求期间切换角色、应用或卸载后，不把旧草稿写给新目标，也不覆盖新角色的回显。
    const isCurrent = () => !disposed && sequence === loadSequence && roleId === target().role?.id
      && scope.applicationId === target().scope.applicationId && scope.templateId === target().scope.templateId
      && scope.isExternal === target().scope.isExternal
    let scopeReady = false
    savingPermissions.value = true
    try {
      let payload: { menus: MenuPermissionNode[]; assetAccesses?: AssetAccessPolicy[] }
      if (menusOnly) {
        const [bounds, bindings] = await Promise.all([readScope(scope), readRoleMenuBindings(scope.applicationId, roleId)])
        if (!isCurrent() || !baseline) return
        const result = baseline.prepare(draft.menus, bounds.candidates, bindings)
        if (result.warning) { menuSaveWarning.value = result.warning; return }
        payload = result
        menuSaveWarning.value = ''
      } else {
        const bounds = await readScope(scope)
        if (!isCurrent()) return
        const permissionScope = resetEditor(bounds, draft.menus)
        const snapshot = editor.getGrantSnapshot()
        if (!snapshot) {
          onlyMessage($t('components.MenuAssetPermissionEditor.fixedScopeSaveBlocked'), 'warning')
          return
        }
        payload = buildApplicationRolePermissionGrant(snapshot, permissionScope, previousMenus)
      }
      scopeReady = true
      const response = await saveBusinessApplicationRoleMenuGrant(
        scope.applicationId, roleId, payload,
      )
      if (menusOnly && response?.success !== true) throw new Error('Menu grant not confirmed')
      assertSuccess(response, undefined)
      if (!isCurrent()) return
      const confirmed = menusOnly ? await readRoleMenuBindings(scope.applicationId, roleId) : undefined
      if (!isCurrent()) return
      if (confirmed && !matchesMenuOnlyWrite(payload.menus, confirmed)) {
        menuSaveWarning.value = 'menuWriteFailed'
        return
      }
      onlyMessage($t('ProjectApplication.role.permissionSuccess', { name: roleName }))
      await refreshPermissions(confirmed)
    } catch {
      if (isCurrent()) {
        if (menusOnly) menuSaveWarning.value = scopeReady ? 'menuWriteFailed' : 'menuVerificationFailed'
        else if (!scopeReady) refreshError.value = true
      }
    } finally {
      savingPermissions.value = false
    }
  }

  return { permissionLoading, permissionError, refreshError, menuSaveWarning, blockedMenuNames, savingPermissions, initialized, inheritedAssetOptions, editor, columns,
    loadPermissions, savePermissions }
}
