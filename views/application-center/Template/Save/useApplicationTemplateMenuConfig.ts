import { ref } from 'vue'
import { onlyMessage } from '@jetlinks-web/utils'
import { useMenuAssetPermissionEditor } from '@jetlinks-web-core/hooks'
import type {
  AssetAccessPolicy,
  AssetTypeName,
  MenuPermissionNode,
} from '@jetlinks-web-core/hooks'
import {
  getApplicationTemplateMenus,
  getAssetScopeStrategies,
  getAssetTypes,
  getCurrentUserMenuTree,
  getGrantableAssetAccesses,
  saveApplicationTemplateMenus,
  type TemplateAssetAccessPolicy,
} from '@authentication-manager-ui/api/application-center/applicationTemplate'
import {
  buildFullMenuGrantTree,
  buildStrategyDraft,
  buildTemplateAssetAccesses,
  DEFAULT_SCOPE_STRATEGY,
  findMissingMenuIds,
  normalizeAssetTypeNames,
  normalizeCandidateMenus,
  normalizeGrantableAssets,
  normalizeScopeStrategyOptions,
  unwrapResult,
  type SelectOption,
} from './menu-config.shared'

interface GrantDetail {
  menus?: MenuPermissionNode[]
  assetAccesses?: TemplateAssetAccessPolicy[]
}

interface MenuConfigMessages {
  loadFailed: string
  saved: string
  notReady: string
  missingMenus: (count: number) => string
}

export const useApplicationTemplateMenuConfig = (
  getTemplateId: () => string,
  messages: MenuConfigMessages,
) => {
  const editor = useMenuAssetPermissionEditor({ defaultSupportIds: ['business_application', 'creator'] })
  const scopeStrategyOptions = ref<SelectOption[]>([])
  const strategyDraft = ref<Record<string, string>>({})
  const missingMenuIds = ref<string[]>([])
  const loadingOptions = ref(false)
  const loadingEditor = ref(false)
  const saving = ref(false)
  const initialized = ref(false)
  const grantedMenus = ref<MenuPermissionNode[]>([])
  const savedAssetAccesses = ref<TemplateAssetAccessPolicy[]>([])
  let loadSequence = 0

  const assertSuccess = <T>(response: any, fallback: T): T => {
    if (response?.success === false) throw new Error(response.message || messages.loadFailed)
    return unwrapResult(response, fallback)
  }

  const loadOptions = async () => {
    loadingOptions.value = true
    try {
      const response = await getAssetScopeStrategies()
      scopeStrategyOptions.value = normalizeScopeStrategyOptions(response)
    } catch (error: any) {
      scopeStrategyOptions.value = []
      onlyMessage(error?.message || messages.loadFailed, 'error')
    } finally {
      loadingOptions.value = false
    }
  }

  const setScopeStrategy = (assetType: string, strategy?: string) => {
    if (!assetType) return
    strategyDraft.value = {
      ...strategyDraft.value,
      [assetType]: strategy || DEFAULT_SCOPE_STRATEGY,
    }
  }

  const clearEditor = () => {
    initialized.value = false
    strategyDraft.value = {}
    missingMenuIds.value = []
    editor.reset({ menus: [], assetTypes: [] })
  }

  const loadEditor = async () => {
    const sequence = ++loadSequence
    const templateId = getTemplateId()
    if (!templateId) {
      clearEditor()
      return
    }

    loadingEditor.value = true
    initialized.value = false
    missingMenuIds.value = []
    editor.reset({ menus: [], assetTypes: [] })
    try {
      const [grantResponse, menuResponse, assetTypesResponse] = await Promise.all([
        getApplicationTemplateMenus(templateId),
        getCurrentUserMenuTree({ paging: false }),
        getAssetTypes(),
      ])
      if (sequence !== loadSequence) return

      const detail = assertSuccess<GrantDetail>(grantResponse, {})
      const sourceMenus = normalizeCandidateMenus(assertSuccess<MenuPermissionNode[]>(menuResponse, []))
      const grantableResponse = await getGrantableAssetAccesses(sourceMenus)
      if (sequence !== loadSequence) return

      grantedMenus.value = Array.isArray(detail.menus) ? detail.menus : []
      savedAssetAccesses.value = Array.isArray(detail.assetAccesses) ? detail.assetAccesses : []
      missingMenuIds.value = findMissingMenuIds(grantedMenus.value, sourceMenus)
      strategyDraft.value = buildStrategyDraft(savedAssetAccesses.value)
      editor.reset({
        menus: sourceMenus,
        grantedMenus: grantedMenus.value,
        assetAccesses: savedAssetAccesses.value as AssetAccessPolicy[],
        assetTypes: normalizeAssetTypeNames(assetTypesResponse) as AssetTypeName[],
        grantableAssets: normalizeGrantableAssets(grantableResponse),
      })
      initialized.value = true
    } catch (error: any) {
      if (sequence === loadSequence) {
        clearEditor()
        onlyMessage(error?.message || messages.loadFailed, 'error')
      }
    } finally {
      if (sequence === loadSequence) loadingEditor.value = false
    }
  }

  const save = async () => {
    const templateId = getTemplateId()
    if (!templateId || !initialized.value) {
      onlyMessage(messages.notReady, 'warning')
      return
    }
    if (missingMenuIds.value.length) {
      onlyMessage(messages.missingMenus(missingMenuIds.value.length), 'warning')
      return
    }

    saving.value = true
    try {
      const snapshot = editor.getSnapshot()
      const response = await saveApplicationTemplateMenus(templateId, {
        menus: buildFullMenuGrantTree(editor.menuTree.value),
        assetAccesses: buildTemplateAssetAccesses(snapshot.assetAccesses, strategyDraft.value),
      })
      assertSuccess(response, undefined)
      onlyMessage(messages.saved)
      await loadEditor()
    } catch (error: any) {
      onlyMessage(error?.message || messages.loadFailed, 'error')
    } finally {
      saving.value = false
    }
  }

  return {
    editor,
    scopeStrategyOptions,
    strategyDraft,
    defaultScopeStrategy: DEFAULT_SCOPE_STRATEGY,
    missingMenuIds,
    loadingOptions,
    loadingEditor,
    saving,
    initialized,
    loadOptions,
    loadEditor,
    setScopeStrategy,
    save,
  }
}
