import { computed, onScopeDispose, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useMenuAssetPermissionEditor, useRegistryOptions } from '@jetlinks-web-core/hooks'
import type { AssetTypeName, MenuPermissionNode } from '@jetlinks-web-core/hooks'
import { isNoCommunity } from '@jetlinks-web-core/utils/utils'
import { USER_CENTER_MENU_CODE } from '@jetlinks-web-core/utils/consts'
import { NotificationSubscriptionCode } from '@jetlinks-web-core/router/menu'
import { getPermissionDetail_api } from '@authentication-manager-ui/api/system/role'
import { getAssetsType } from '@authentication-manager-ui/api/system/menu'
import { cleanRoleAssetPermissions } from './roleAssetPermissions'
import { buildRoleTemplateGroups, buildRoleGrantSnapshot, roleTemplateScopeFingerprint } from './roleTemplatePermissions'
import { loadRoleTemplateScope, requirePermissionResult } from './roleTemplatePermissionService'

const filterMenus = (menus: MenuPermissionNode[]): MenuPermissionNode[] => menus
  .filter(menu => menu.code !== NotificationSubscriptionCode)
  .map(menu => ({ ...menu, children: filterMenus(menu.children || []) }))

/** 全局角色保留完整授权草稿，模板交集仅生成可编辑视图；保存前验证范围，避免静默覆盖。 */
export function useGlobalRolePermissions() {
  const route = useRoute()
  const { t } = useI18n()
  const loading = ref(false)
  const validating = ref(false)
  const initialized = ref(false)
  const loadError = ref(false)
  const scopeChanged = ref(false)
  let sequence = 0
  let fingerprint = ''
  const editor = useMenuAssetPermissionEditor({
    defaultSupportIds: ['creator'], protectedMenuCode: USER_CENTER_MENU_CODE, protectedButtonId: 'view',
  })
  const baseColumns = computed(() => [
    { title: t('components.PermissionTree.954862-0'), dataIndex: 'menu', key: 'menu', width: '38%' },
    { title: t('components.PermissionTree.954862-6'), dataIndex: 'action', key: 'action' },
  ])
  const { mergedOptions: columns } = useRegistryOptions({ baseOptions: baseColumns, code: 'permission-tree-columns' })
  const query = { 'terms[0].column': 'options', 'terms[0].termType': 'nlike', 'terms[0].value': '%show":false%' }
  const ownerLabels = computed(() => ({ iot: t('Role.templates.basicMenus') }))

  const loadAssetTypes = async (): Promise<AssetTypeName[]> => {
    if (!isNoCommunity) return []
    try {
      const result = requirePermissionResult<AssetTypeName[]>(await getAssetsType())
      return Array.isArray(result) ? result : []
    } catch {
      onlyMessage(t('Permission.index.071527-3'), 'error')
      return []
    }
  }

  const load = async () => {
    const current = ++sequence
    const roleId = String(route.params.id || '')
    initialized.value = false
    loadError.value = false
    if (!roleId) { loading.value = false; return }
    loading.value = true
    try {
      const [response, scope, assetTypes] = await Promise.all([
        getPermissionDetail_api(roleId, query), loadRoleTemplateScope(), loadAssetTypes(),
      ])
      if (current !== sequence) return
      const detail = requirePermissionResult(response)
      if (!Array.isArray(detail.menus) || !Array.isArray(detail.assetAccesses)) throw new Error('Role permissions unavailable')
      const menus = filterMenus(detail.menus)
      editor.reset(cleanRoleAssetPermissions({
        menus, assetAccesses: detail.assetAccesses, assetTypes,
        menuGroups: buildRoleTemplateGroups(menus, scope.userMenus, scope.templates, t('Role.templates.basicMenus')),
      }))
      fingerprint = roleTemplateScopeFingerprint(scope.userMenus, scope.templates)
      scopeChanged.value = false
      initialized.value = true
    } catch {
      if (current === sequence) loadError.value = true
    } finally {
      if (current === sequence) loading.value = false
    }
  }

  const onSave = async () => {
    if (!initialized.value || scopeChanged.value || validating.value) return undefined
    const current = sequence
    validating.value = true
    try {
      const scope = await loadRoleTemplateScope()
      if (current !== sequence || !initialized.value) return undefined
      if (roleTemplateScopeFingerprint(scope.userMenus, scope.templates) !== fingerprint) {
        scopeChanged.value = true
        return undefined
      }
      return buildRoleGrantSnapshot(editor.menuTree.value, editor.getSnapshot())
    } catch {
      if (current === sequence) onlyMessage(t('Role.templates.verifyFailed'), 'error')
      return undefined
    } finally {
      validating.value = false
    }
  }

  watch(() => route.params.id, load, { immediate: true, flush: 'sync' })
  onScopeDispose(() => { sequence++; initialized.value = false })
  const canSave = computed(() => initialized.value && !scopeChanged.value && !validating.value)
  return { editor, columns, ownerLabels, loading, validating, initialized, loadError, scopeChanged, canSave, load, onSave, isNoCommunity }
}
