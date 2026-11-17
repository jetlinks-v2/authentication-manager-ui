import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RouteRecordRaw } from 'vue-router'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { onlyMessage } from '@jetlinks-web/utils'
import { notifyDocumentHelpConfigurationChanged } from '@jetlinks-web-core/hooks/useConfiguredDocumentHelp'
import { getDocumentHelpPoints } from '@jetlinks-web-core/utils/documentHelpRegistry'
import type { ConditionTerm } from '@jetlinks-web-core/components/ConditionFilter'
import { getDocumentHelpConfigurations, saveDocumentHelpConfiguration, updateDocumentHelpEnabled, type DocumentHelpConfiguration } from '../../../api/system/documentHelp'
import { filterHelpPoints, mergeHelpPoints, type DocumentHelpRow } from './model'
import { buildHelpTree, filterHelpTree, findHelpTreeNode } from './helpTree'

export function useDocumentManagement() {
  const { t, locale } = useI18n()
  const menuStore = useMenuStore()
  const configurations = ref<DocumentHelpConfiguration[]>([])
  const revision = ref(0), loaded = ref(false), loading = ref(false), failed = ref(false)
  const scope = ref('all'), routeKeyword = ref(''), terms = ref<ConditionTerm[]>([])
  const draftEnabled = ref(true), updating = ref('')
  const selectedKeys = ref<string[]>([])
  const current = ref<DocumentHelpRow>(), draft = ref(''), saving = ref(false), saveFailed = ref(false)
  const points = computed(() => { locale.value; revision.value; return getDocumentHelpPoints() })
  const rows = computed(() => loaded.value ? mergeHelpPoints(points.value, configurations.value) : [])
  const menuTree = computed(() => {
    locale.value
    return buildHelpTree(rows.value, menuStore.siderMenus as RouteRecordRaw[], t, t('DocumentManagement.otherPages'))
  })
  const activeNode = computed(() => findHelpTreeNode(menuTree.value, scope.value))
  const filteredRows = computed(() => activeNode.value
    ? filterHelpPoints(rows.value.filter(row => activeNode.value!.rowIds.includes(row.id)), 'all', terms.value)
    : filterHelpPoints(rows.value, scope.value, terms.value))
  const nodes = computed(() => [
    { key: 'all', title: t('DocumentManagement.all'), count: rows.value.length },
    { key: 'ready', title: t('DocumentManagement.configured'), count: rows.value.filter(row => row.configured).length },
    { key: 'missing', title: t('DocumentManagement.missing'), count: rows.value.filter(row => !row.configured).length },
    ...filterHelpTree(menuTree.value, routeKeyword.value),
  ])
  function findMenuLocation(menus: RouteRecordRaw[], code: string, parents: string[] = []): { title: string; path: string } | undefined {
    for (const menu of menus) {
      const label = menu.meta?.title
      const path = label && menu.meta?.hideInMenu !== true ? [...parents, t(String(label))] : parents
      if (menu.name === code) return { title: path.join(' / '), path: menu.path }
      const nested = menu.children && findMenuLocation(menu.children, code, path)
      if (nested) return nested
    }
  }
  const menuLocation = computed(() => {
    locale.value
    return scope.value.startsWith('route:')
      ? findMenuLocation(menuStore.siderMenus as RouteRecordRaw[], scope.value.slice(6)) : undefined
  })
  const routePath = computed(() => activeNode.value?.path || menuLocation.value?.path || '')
  const title = computed(() => {
    if (activeNode.value) return activeNode.value.breadcrumb
    if (!scope.value.startsWith('route:')) {
      return t(`DocumentManagement.${scope.value === 'ready' ? 'configured' : scope.value === 'missing' ? 'missing' : 'all'}`)
    }
    locale.value
    const code = scope.value.slice(6)
    return menuLocation.value?.title
      || points.value.find(point => point.code === code)?.page
  })

  // 失败时不把已有配置当作空配置，也不允许从错误状态继续编辑。
  async function load() {
    if (loading.value) return
    loading.value = true
    failed.value = false
    try {
      const response = await getDocumentHelpConfigurations()
      if (!response.success || !Array.isArray(response.result)) throw new Error('load')
      configurations.value = response.result
      revision.value++
      loaded.value = true
    } catch { failed.value = true } finally { loading.value = false }
  }
  function edit(row: DocumentHelpRow) {
    current.value = row
    draft.value = row.content
    draftEnabled.value = row.configured ? row.enabled : true
    saveFailed.value = false
  }
  function close() { if (!saving.value) current.value = undefined }
  // 仅在保存成功后更新列表；失败保留抽屉、草稿和原配置。
  async function save() {
    if (!current.value || saving.value || updating.value) return
    const configuration = { code: current.value.code, key: current.value.key, content: draft.value, enabled: draftEnabled.value && Boolean(draft.value.trim()) }
    saving.value = true
    saveFailed.value = false
    try {
      const response = await saveDocumentHelpConfiguration(configuration)
      if (!response.success) throw new Error('save')
      configurations.value = [...configurations.value.filter(item => item.code !== configuration.code || item.key !== configuration.key), configuration]
      notifyDocumentHelpConfigurationChanged()
      current.value = undefined
      onlyMessage(t('DocumentManagement.saved'))
    } catch { saveFailed.value = true } finally { saving.value = false }
  }
  async function toggleEnabled(row: DocumentHelpRow) {
    if (!row.configured || saving.value || updating.value) return
    updating.value = row.id
    const configuration = { code: row.code, key: row.key, content: row.content, enabled: !row.enabled }
    try {
      const response = await saveDocumentHelpConfiguration(configuration)
      if (!response.success) throw new Error('save')
      configurations.value = configurations.value.map(item =>
        item.code === row.code && item.key === row.key ? configuration : item)
      notifyDocumentHelpConfigurationChanged()
      onlyMessage(t(configuration.enabled ? 'DocumentManagement.enabledSuccess' : 'DocumentManagement.disabledSuccess'))
    } catch { onlyMessage(t('DocumentManagement.toggleFailed'), 'error') }
    finally { updating.value = '' }
  }
  async function batchToggle(enabled: boolean, allConfigured = false) {
    if (updating.value || (!allConfigured && !selectedKeys.value.length)) return
    updating.value = 'batch'
    try {
      const points = allConfigured ? undefined : rows.value.filter(row => selectedKeys.value.includes(row.id) && row.configured).map(row => ({ code: row.code, key: row.key }))
      const response = await updateDocumentHelpEnabled({ enabled, allConfigured, points })
      if (!response.success || !Array.isArray(response.result)) throw new Error('batch-save')
      configurations.value = response.result
      selectedKeys.value = []
      revision.value++
      notifyDocumentHelpConfigurationChanged()
      onlyMessage(t(enabled ? 'DocumentManagement.enabledSuccess' : 'DocumentManagement.disabledSuccess'))
    } catch { onlyMessage(t('DocumentManagement.toggleFailed'), 'error') }
    finally { updating.value = '' }
  }
  onMounted(() => load())
  return { rows, filteredRows, scope, routeKeyword, terms, nodes, title, routePath, loading, failed, loaded,
    current, draft, draftEnabled, saving, updating, selectedKeys, saveFailed, load, edit, close, save, toggleEnabled, batchToggle }
}
