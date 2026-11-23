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
export function useApplicationRolePermissions(target: () => ApplicationRolePermissionTarget) {
  const { t: $t } = useI18n()
  const permissionLoading = ref(false)
  const permissionError = ref(false)
  const savingPermissions = ref(false)
  const initialized = ref(false)
  const inheritedAssetAccesses = ref<AssetAccessPolicy[]>([])
  const blockedMenuNames = ref<string[]>([])
  const refreshError = ref(false)
  let savedRoleMenus: MenuPermissionNode[] = []
  const savedFixedPolicies = ref<AssetAccessPolicy[]>([])
  const assetDefinitions = ref<GrantableAssetType[]>([])
  const editor = useMenuAssetPermissionEditor({ defaultSupportIds: ['creator'] })
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
    if (!isNoCommunity) return []
    const response = await queryAssetTypes()
    if (response?.success === false) throw new Error(response.message)
    return normalizeAssetTypeNames(response)
  }

  // 加载和保存走同一份实时可下授目录，不能把模板或角色的已存策略当作操作者的权限。
  const readScope = async (scope: ApplicationRoleScope) => {
    const [templateResponse, userResponse, applicationResponse] = await Promise.all([
      getBusinessApplicationTemplateMenus(scope.templateId),
      getCurrentUserMenuTree(buildApplicationRoleMenuQuery(scope.isExternal)),
      getBusinessApplicationMenus(scope.applicationId),
    ])
    const template = assertSuccess<GrantDetail>(templateResponse, {})
    const application = assertSuccess<GrantDetail>(applicationResponse, {})
    const currentUserMenus = assertSuccess<MenuPermissionNode[] | null>(userResponse, null)
    if (!Array.isArray(application.menus) || !Array.isArray(template.menus) || !Array.isArray(currentUserMenus)
      || !Array.isArray(application.assetAccesses) || !application.assetAccesses.every(policy => policy?.assetType
        && Array.isArray(policy.accesses) && policy.accesses.every(access => typeof access?.supportId === 'string' && access.supportId))) {
      throw new Error('Application role grant scope unavailable')
    }
    const candidates = getApplicationRoleMenuCandidates({ isExternal: scope.isExternal, currentUserMenus,
      templateMenus: template.menus, applicationMenus: application.menus })
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

  const loadPermissions = async () => {
    const sequence = ++loadSequence
    const { scope, role } = target()
    if (scope.isExternal || !role?.id || !scope.applicationId || !scope.templateId) {
      clearPermissions()
      return
    }
    initialized.value = false
    permissionLoading.value = true
    permissionError.value = false
    try {
      const [roleResponse, assetTypes, bounds] = await Promise.all([
        getBusinessApplicationRoleMenuGrantDetail(scope.applicationId, role.id), loadAssetTypes(), readScope(scope),
      ])
      const roleDetail = assertSuccess<GrantDetail>(roleResponse, {})
      if (!Array.isArray(roleDetail.menus)) throw new Error('Role menus unavailable')
      if (sequence !== loadSequence) return
      const permissionScope = resolveApplicationRolePermissionScope({ ...bounds, roleMenus: roleDetail.menus })

      const { definitions } = bounds
      savedRoleMenus = previousRoleBindings(roleDetail.menus)
      blockedMenuNames.value = permissionScope.blockedMenuNames
      refreshError.value = false
      loadedAssetTypes = assetTypes
      assetDefinitions.value = definitions
      inheritedAssetAccesses.value = permissionScope.assetAccesses
      savedFixedPolicies.value = (roleDetail.assetAccesses || []).filter(policy => isFixedNotificationAsset(policy.assetType))
      editor.reset({ ...permissionScope, assetTypes,
        assetAccesses: [...permissionScope.assetAccesses.filter(policy => !isFixedNotificationAsset(policy.assetType)), ...savedFixedPolicies.value],
        fixedAssetGrantable: inheritedFixedGrantable(permissionScope.menus, permissionScope.assetAccesses, definitions),
      })
      initialized.value = true
    } catch {
      if (sequence === loadSequence) { clearPermissions(); permissionError.value = true }
    } finally {
      if (sequence === loadSequence) permissionLoading.value = false
    }
  }

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
    const previousMenus = [...savedRoleMenus, ...editor.flatMenus.value]
    // 请求期间切换角色、应用或卸载后，不把旧草稿写给新目标，也不覆盖新角色的回显。
    const isCurrent = () => !disposed && sequence === loadSequence && roleId === target().role?.id
      && scope.applicationId === target().scope.applicationId && scope.templateId === target().scope.templateId
      && scope.isExternal === target().scope.isExternal
    let scopeReady = false
    savingPermissions.value = true
    try {
      const bounds = await readScope(scope)
      if (!isCurrent()) return
      const permissionScope = resolveApplicationRolePermissionScope({ ...bounds, roleMenus: draft.menus })
      const { definitions } = bounds
      assetDefinitions.value = definitions
      refreshError.value = false
      blockedMenuNames.value = permissionScope.blockedMenuNames
      inheritedAssetAccesses.value = permissionScope.assetAccesses
      editor.reset({ ...permissionScope, assetTypes: loadedAssetTypes,
        assetAccesses: [...permissionScope.assetAccesses.filter(policy => !isFixedNotificationAsset(policy.assetType)), ...savedFixedPolicies.value],
        fixedAssetGrantable: inheritedFixedGrantable(permissionScope.menus, permissionScope.assetAccesses, definitions),
      })
      scopeReady = true
      const snapshot = editor.getGrantSnapshot()
      if (!snapshot) {
        onlyMessage($t('components.MenuAssetPermissionEditor.fixedScopeSaveBlocked'), 'warning')
        return
      }
      const payload = buildApplicationRolePermissionGrant(snapshot, permissionScope, previousMenus)
      const response = await saveBusinessApplicationRoleMenuGrant(
        scope.applicationId, roleId, payload,
      )
      assertSuccess(response, undefined)
      if (!isCurrent()) return
      onlyMessage($t('ProjectApplication.role.permissionSuccess', { name: roleName }))
      await loadPermissions()
    } catch {
      if (!scopeReady && isCurrent()) refreshError.value = true
    } finally {
      savingPermissions.value = false
    }
  }

  return { permissionLoading, permissionError, refreshError, blockedMenuNames, savingPermissions, initialized, inheritedAssetOptions, editor, columns,
    loadPermissions, savePermissions }
}
