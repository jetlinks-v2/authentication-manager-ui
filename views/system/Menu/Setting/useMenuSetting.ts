import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AntTreeNodeDropEvent } from 'ant-design-vue/es/tree'
import { onlyMessage } from '@jetlinks-web-core/utils/comm'
import type { MenuDefinition } from '@authentication-manager-ui/api/system/menu'
import { loadMenuSettings, saveMenuSettings } from './menuSettingService'
import { buildMenuPayloads, flattenMenus, synchronizeMenuDefinitions } from './utils'
import type { MenuDrafts, MenuOwner, MenuRecord } from './utils'
import { hasValidMenuDepth, moveMenu, selectMenu } from './menuTree'

/** 管理两个 owner 的独立草稿，以及加载、保存和权限同步的统一生命周期。 */
export const useMenuSetting = () => {
  const { t } = useI18n()
  const activeOwner = ref<MenuOwner>('iot')
  const drafts = ref<MenuDrafts>({ iot: [], app: [] })
  const preserved = ref<MenuRecord[]>([])
  const baseMenus = ref<MenuDefinition[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const loaded = ref(false)
  const loadError = ref(false)
  const failedOwners = ref<MenuOwner[]>([])
  const visible = ref(false)
  const treeData = computed(() => drafts.value[activeOwner.value])
  const selectedKeys = computed(() => flattenMenus(treeData.value)
    .filter(menu => menu.options?.show === true).map(menu => menu.id))
  const busy = computed(() => loading.value || saving.value)
  const canSave = computed(() => loaded.value && !busy.value)
  const ownerLabel = (owner: MenuOwner) => t(`MenuSetting.owner.${owner}`)
  const failureMessage = computed(() => failedOwners.value.length ? t('MenuSetting.saveFailed', {
    owners: failedOwners.value.map(ownerLabel).join('、'),
  }) : '')

  const load = async () => {
    loading.value = true
    loadError.value = false
    loaded.value = false
    try {
      const result = await loadMenuSettings()
      drafts.value = result.drafts
      preserved.value = result.preserved
      baseMenus.value = result.base
      loaded.value = true
      failedOwners.value = []
    } catch {
      loadError.value = true
    } finally {
      loading.value = false
    }
  }

  const onSelect = (_keys: (string | number)[], info: { node: { key?: string | number }; selected: boolean }) => {
    if (!canSave.value) return
    drafts.value[activeOwner.value] = selectMenu(treeData.value, String(info.node.key), info.selected)
  }

  const onDrop = (info: AntTreeNodeDropEvent) => {
    if (!canSave.value) return
    const position = info.dropPosition - Number(info.node.pos?.split('-').at(-1) ?? 0)
    const inside = !info.dropToGap || (!!info.node.children?.length && info.node.expanded && position === 1)
    const tree = moveMenu(treeData.value, {
      dragId: String(info.dragNode.key), targetId: String(info.node.key),
      placement: inside ? 'inside' : position === -1 ? 'before' : 'after',
    })
    const nextDrafts = { ...drafts.value, [activeOwner.value]: tree }
    if (!hasValidMenuDepth(nextDrafts, preserved.value)) {
      onlyMessage(t('Setting.index.113436-9'), 'error')
      return
    }
    drafts.value = nextDrafts
  }

  const save = async (synchronize = false) => {
    if (!canSave.value) return
    saving.value = true
    failedOwners.value = []
    try {
      if (synchronize) drafts.value = synchronizeMenuDefinitions(drafts.value, baseMenus.value)
      failedOwners.value = await saveMenuSettings(buildMenuPayloads(drafts.value, preserved.value))
      if (failedOwners.value.length) return
      visible.value = false
      onlyMessage(t('Setting.index.113436-8'), 'success')
      location.reload()
    } finally {
      saving.value = false
    }
  }

  onMounted(load)
  return { activeOwner, treeData, selectedKeys, visible, loading, saving, loadError, failureMessage,
    busy, canSave, ownerLabel, load, onSelect, onDrop, save }
}
