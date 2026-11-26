import { cloneDeep } from 'lodash-es'
import { computed, ref } from 'vue'
import { onlyMessage } from '@jetlinks-web/utils'
import { useMenuAssetPermissionEditor } from '@jetlinks-web-core/hooks'
import type {
  AssetTypeName,
  MenuAssetPermissionResetOptions,
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
  filterApplicationMenuInterfacePermissions,
  filterAssetAccessPoliciesByMenuScope,
  filterGrantedMenuAssetAccessesByMenuScope,
  findMissingMenuIds,
  normalizeAssetTypeNames,
  normalizeCandidateMenus,
  normalizeGrantedMenus,
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

/** 维护模板菜单与资产权限草稿，编辑流程不改变公共编辑器的授权规则。 */
export const useApplicationTemplateMenuConfig = (
  getTemplateId: () => string,
  messages: MenuConfigMessages,
  canEdit: () => boolean = () => true,
) => {
  const editor = useMenuAssetPermissionEditor({ defaultSupportIds: ['business_application', 'creator'] })
  const scopeStrategyOptions = ref<SelectOption[]>([])
  const strategyDraft = ref<Record<string, string>>({})
  const missingMenuIds = ref<string[]>([])
  const loadingOptions = ref(false)
  const loadingEditor = ref(false)
  const saving = ref(false)
  const initialized = ref(false)
  const editing = ref(false)
  const loadError = ref('')
  const canUpdate = computed(canEdit)
  const grantedMenus = ref<MenuPermissionNode[]>([])
  const savedAssetAccesses = ref<TemplateAssetAccessPolicy[]>([])
  let loadSequence = 0
  let savedEditorInput: MenuAssetPermissionResetOptions | undefined
  let savedStrategies: Record<string, string> = {}

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
    editing.value = false
    savedEditorInput = undefined
    savedStrategies = {}
    strategyDraft.value = {}
    missingMenuIds.value = []
    editor.reset({ menus: [], assetTypes: [] })
  }

  const loadEditor = async () => {
    const sequence = ++loadSequence
    const templateId = getTemplateId()
    editing.value = false
    loadError.value = ''
    savedEditorInput = undefined
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
        getCurrentUserMenuTree({ paging: false, terms: [{ column: 'owner', value: 'app' }] }),
        getAssetTypes(),
      ])
      if (sequence !== loadSequence) return

      const detail = assertSuccess<GrantDetail>(grantResponse, {})
      const ownMenus = filterApplicationMenuInterfacePermissions(
        assertSuccess<MenuPermissionNode[]>(menuResponse, []),
      )
      const sourceMenus = normalizeCandidateMenus(ownMenus)
      const grantableResponse = await getGrantableAssetAccesses(ownMenus)
      if (sequence !== loadSequence) return

      const savedMenus = filterApplicationMenuInterfacePermissions(
        Array.isArray(detail.menus) ? detail.menus : [],
      )
      // 模板回显包含完整候选，先按项目菜单裁剪，避免保存后增加项目范围外的数据权限。
      grantedMenus.value = normalizeGrantedMenus(
        filterGrantedMenuAssetAccessesByMenuScope(savedMenus, sourceMenus),
        sourceMenus,
      )
      savedAssetAccesses.value = Array.isArray(detail.assetAccesses) ? detail.assetAccesses : []
      missingMenuIds.value = findMissingMenuIds(grantedMenus.value, sourceMenus)
      strategyDraft.value = buildStrategyDraft(savedAssetAccesses.value)
      const grantableAssets = normalizeGrantableAssets(grantableResponse)
      const editorInput: MenuAssetPermissionResetOptions = {
        menus: sourceMenus,
        grantedMenus: grantedMenus.value,
        assetAccesses: filterAssetAccessPoliciesByMenuScope(savedAssetAccesses.value, sourceMenus),
        assetTypes: normalizeAssetTypeNames(assetTypesResponse) as AssetTypeName[],
        grantableAssets: grantableAssets.length ? grantableAssets : undefined,
      }
      // 保存完整候选及原始回显，取消时不以只包含已选项的提交快照重建候选。
      savedEditorInput = cloneDeep(editorInput)
      savedStrategies = { ...strategyDraft.value }
      editor.reset(editorInput)
      initialized.value = true
    } catch (error: any) {
      if (sequence === loadSequence) {
        clearEditor()
        loadError.value = error?.message || messages.loadFailed
        onlyMessage(loadError.value, 'error')
      }
    } finally {
      if (sequence === loadSequence) loadingEditor.value = false
    }
  }

  const edit = () => {
    if (canUpdate.value && initialized.value && !loadingEditor.value && !saving.value) editing.value = true
  }

  /** 取消只恢复内存草稿，不重新请求或写入权限；候选裁剪与加载时保持一致。 */
  const cancel = () => {
    if (saving.value || !editing.value) return
    if (savedEditorInput) editor.reset(cloneDeep(savedEditorInput))
    strategyDraft.value = { ...savedStrategies }
    editing.value = false
  }

  const save = async (): Promise<boolean> => {
    if (saving.value || !canUpdate.value) return false
    const templateId = getTemplateId()
    if (!templateId || !initialized.value) {
      onlyMessage(messages.notReady, 'warning')
      return false
    }
    // if (missingMenuIds.value.length) {
    //   onlyMessage(messages.missingMenus(missingMenuIds.value.length), 'warning')
    //   return
    // }

    const sequence = loadSequence
    saving.value = true
    try {
      const snapshot = editor.getSnapshot()
      const response = await saveApplicationTemplateMenus(templateId, {
        menus: buildFullMenuGrantTree(editor.menuTree.value),
        assetAccesses: buildTemplateAssetAccesses(snapshot.assetAccesses, strategyDraft.value),
      })
      assertSuccess(response, undefined)
      // 保存期间切换模板时，不让旧请求关闭新模板的编辑态或触发额外重载。
      if (sequence !== loadSequence || templateId !== getTemplateId()) return true
      onlyMessage(messages.saved)
      await loadEditor()
      return true
    } catch (error: any) {
      onlyMessage(error?.message || messages.loadFailed, 'error')
      return false
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
    canUpdate,
    editing,
    loadError,
    loadOptions,
    loadEditor,
    setScopeStrategy,
    edit,
    cancel,
    save,
  }
}

export type ApplicationTemplateMenuConfigState = ReturnType<typeof useApplicationTemplateMenuConfig>
