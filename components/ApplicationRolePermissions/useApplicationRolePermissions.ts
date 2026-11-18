import { computed, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useMenuAssetPermissionEditor } from '@jetlinks-web-core/hooks'
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

/** 应用详情与系统角色权限页共用授权边界；保存前刷新应用及模板，切换目标后忽略过期请求。 */
export function useApplicationRolePermissions(target: () => ApplicationRolePermissionTarget) {
  const { t: $t } = useI18n()
  const permissionLoading = ref(false)
  const permissionError = ref(false)
  const savingPermissions = ref(false)
  const initialized = ref(false)
  const inheritedAssetAccesses = ref<AssetAccessPolicy[]>([])
  const assetDefinitions = ref<GrantableAssetType[]>([])
  const editor = useMenuAssetPermissionEditor({ defaultSupportIds: ['creator'] })
  // 展示模板原值，避免共享编辑器的默认 creator 草稿被误认为继承的数据权限。
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
      const [templateResponse, userMenuResponse, applicationResponse, detailResponse, assetTypes] = await Promise.all([
        getBusinessApplicationTemplateMenus(scope.templateId),
        getCurrentUserMenuTree(buildApplicationRoleMenuQuery(scope.isExternal)),
        getBusinessApplicationMenus(scope.applicationId),
        getBusinessApplicationRoleMenuGrantDetail(scope.applicationId, role.id),
        loadAssetTypes(),
      ])
      if (sequence !== loadSequence) return

      const templateDetail = assertSuccess<GrantDetail>(templateResponse, {})
      const roleDetail = assertSuccess<GrantDetail>(detailResponse, {})
      const applicationDetail = assertSuccess<GrantDetail>(applicationResponse, {})
      if (!Array.isArray(applicationDetail.menus)) throw new Error('Application menus unavailable')
      const permissionScope = resolveApplicationRolePermissionScope({
        isExternal: scope.isExternal,
        currentUserMenus: assertSuccess<MenuPermissionNode[]>(userMenuResponse, []),
        templateMenus: templateDetail.menus,
        applicationMenus: applicationDetail.menus,
        roleMenus: Array.isArray(roleDetail.menus) ? roleDetail.menus : [],
        templateAssetAccesses: templateDetail.assetAccesses,
      })

      // 策略名称复用现有授权目录，仅用于只读展示，不改变模板继承值或菜单交集。
      const definitions = isNoCommunity && permissionScope.menus.length
        ? await getGrantableAssetAccesses(permissionScope.menus).then(normalizeGrantableAssets).catch(() => [])
        : []
      if (sequence !== loadSequence) return

      loadedAssetTypes = assetTypes
      assetDefinitions.value = definitions
      inheritedAssetAccesses.value = permissionScope.assetAccesses
      editor.reset({ ...permissionScope, assetTypes })
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
    const previousMenus = editor.flatMenus.value
    // 请求期间切换角色、应用或卸载后，不把旧草稿写给新目标，也不覆盖新角色的回显。
    const isCurrent = () => !disposed && sequence === loadSequence && roleId === target().role?.id
      && scope.applicationId === target().scope.applicationId && scope.templateId === target().scope.templateId
      && scope.isExternal === target().scope.isExternal
    savingPermissions.value = true
    try {
      const [templateResponse, userMenuResponse, applicationResponse] = await Promise.all([
        getBusinessApplicationTemplateMenus(scope.templateId),
        getCurrentUserMenuTree(buildApplicationRoleMenuQuery(scope.isExternal)),
        getBusinessApplicationMenus(scope.applicationId),
      ])
      if (!isCurrent()) return
      const template = assertSuccess<GrantDetail>(templateResponse, {})
      const applicationDetail = assertSuccess<GrantDetail>(applicationResponse, {})
      if (!Array.isArray(applicationDetail.menus)) throw new Error('Application menus unavailable')
      const permissionScope = resolveApplicationRolePermissionScope({
        isExternal: scope.isExternal,
        currentUserMenus: assertSuccess<MenuPermissionNode[]>(userMenuResponse, []),
        templateMenus: template.menus,
        applicationMenus: applicationDetail.menus,
        templateAssetAccesses: template.assetAccesses,
        roleMenus: draft.menus,
      })
      inheritedAssetAccesses.value = permissionScope.assetAccesses
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

  return { permissionLoading, permissionError, savingPermissions, initialized, inheritedAssetOptions, editor, columns,
    loadPermissions, savePermissions }
}
