import { computed, ref, watch } from 'vue'
import type { MenuPermissionButton, MenuPermissionNode } from '@jetlinks-web-core/hooks'
import type { ApplicationTemplateMenuConfigState } from './useApplicationTemplateMenuConfig'

export interface TemplatePermissionMenuRow {
  id: string
  name: string
  depth: number
  menu: MenuPermissionNode
  buttons: MenuPermissionButton[]
  grantedButtons: MenuPermissionButton[]
  children?: TemplatePermissionMenuRow[]
}

/** 仅组织权限面板的展示、展开及批量操作，实际授权联动仍交给公共编辑器。 */
export const useApplicationTemplatePermissionView = (state: ApplicationTemplateMenuConfigState) => {
  const { editor } = state
  const activeOwner = ref('')
  const expandedKeys = ref<string[]>([])
  const batchOpen = ref(false)
  const batchStrategy = ref<string>()
  const batchSupportId = ref<string>()
  const disabled = computed(() => !state.editing.value || !state.canUpdate.value
    || state.saving.value || state.loadingEditor.value || !state.initialized.value)
  const activeMenus = computed(() => (
    editor.ownerGroups.value.find(group => group.key === activeOwner.value) || editor.ownerGroups.value[0]
  )?.menus || [])

  const menuRows = computed(() => {
    const visit = (menus: MenuPermissionNode[], depth = 0): TemplatePermissionMenuRow[] => menus.map(menu => ({
      id: menu.id,
      name: menu.i18nName || menu.name || menu.code || menu.id,
      depth,
      menu,
      buttons: menu.buttons || [],
      grantedButtons: (menu.buttons || []).filter(button => button.granted),
      children: menu.children?.length ? visit(menu.children, depth + 1) : undefined,
    }))
    return visit(activeMenus.value)
  })

  const strategyOf = (assetType: string) => state.strategyDraft.value[assetType] || state.defaultScopeStrategy
  const assetRows = computed(() => editor.visibleAssets.value.map(asset => {
    const strategy = strategyOf(asset.assetType)
    const selected = asset.accesses.find(access => access.supportId === asset.selectedSupportId)
    return {
      ...asset,
      strategy,
      strategyLabel: state.scopeStrategyOptions.value.find(option => option.value === strategy)?.label || strategy,
      supportLabel: selected?.i18nName || selected?.name || asset.selectedSupportId,
    }
  }))
  const hasGrantedMenus = computed(() => editor.flatMenus.value.some(menu => menu.granted))
  const canBatch = computed(() => !disabled.value && assetRows.value.length > 0
    && (editor.batchAssetOptions.value.length > 0 || state.scopeStrategyOptions.value.some(option => !option.disabled)))
  const validBatchStrategy = computed(() => state.scopeStrategyOptions.value.some(
    option => option.value === batchStrategy.value && !option.disabled,
  ))
  const validBatchSupport = computed(() => editor.batchAssetOptions.value.some(option => option.value === batchSupportId.value))
  const canApplyBatch = computed(() => canBatch.value && (validBatchStrategy.value || validBatchSupport.value))

  const toggleMenu = (menuId: string, checked: boolean) => {
    const menu = editor.flatMenus.value.find(item => item.id === menuId)
    if (!disabled.value && menu) editor.toggleMenu(menu, checked)
  }
  const setExpandedKeys = (keys: Array<string | number>) => { expandedKeys.value = keys.map(String) }
  const rowClassName = (row: TemplatePermissionMenuRow) => row.depth ? 'template-permission__child' : ''
  const toggleButton = (menuId: string, buttonId: string, checked: boolean) => {
    const menu = editor.flatMenus.value.find(item => item.id === menuId)
    const button = menu?.buttons?.find(item => item.id === buttonId)
    if (!disabled.value && menu && button) editor.toggleButton(menu, button, checked)
  }
  const setAssetAccess = (assetType: string, value: string) => {
    const asset = editor.visibleAssets.value.find(item => item.assetType === assetType)
    if (!disabled.value && asset?.accesses.some(access => access.supportId === value && !access.disabled)) {
      editor.setAssetAccess(assetType, value)
    }
  }
  const setScopeStrategy = (assetType: string, value: unknown) => {
    if (!disabled.value && typeof value === 'string' && state.scopeStrategyOptions.value.some(option => option.value === value && !option.disabled)) {
      state.setScopeStrategy(assetType, value)
    }
  }

  /** 批量面板只回显共同值；混合范围保持未选，避免打开面板就改写权限。 */
  const toggleBatch = () => {
    if (!canBatch.value) return
    batchOpen.value = !batchOpen.value
    if (!batchOpen.value) return
    batchSupportId.value = editor.batchAssetValue.value
    const strategies = new Set(editor.visibleAssets.value.map(asset => strategyOf(asset.assetType)))
    batchStrategy.value = strategies.size === 1 ? Array.from(strategies)[0] : undefined
  }

  /** 提交前重新校验候选交集，菜单联动导致候选变化时不能套用已失效的范围。 */
  const applyBatch = () => {
    if (!canApplyBatch.value) return
    if (validBatchSupport.value) editor.applyAssetBatch(batchSupportId.value)
    if (validBatchStrategy.value) {
      editor.visibleAssets.value.forEach(asset => state.setScopeStrategy(asset.assetType, batchStrategy.value))
    }
    batchOpen.value = false
  }

  watch(editor.ownerGroups, groups => {
    if (!groups.some(group => group.key === activeOwner.value)) activeOwner.value = groups[0]?.key || ''
  }, { immediate: true })
  // 查看态展开全部菜单，进入编辑时从一级菜单开始；页签切换不会重建这些局部状态。
  watch([editor.menuTree, state.editing], () => {
    expandedKeys.value = state.editing.value ? [] : editor.flatMenus.value.filter(menu => menu.children?.length).map(menu => menu.id)
    batchOpen.value = false
  }, { immediate: true })

  return {
    activeOwner,
    expandedKeys,
    batchOpen,
    batchStrategy,
    batchSupportId,
    disabled,
    menuRows,
    assetRows,
    hasGrantedMenus,
    canBatch,
    canApplyBatch,
    toggleMenu,
    setExpandedKeys,
    rowClassName,
    toggleButton,
    setAssetAccess,
    setScopeStrategy,
    toggleBatch,
    applyBatch,
  }
}
