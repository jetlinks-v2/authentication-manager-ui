import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { notifyDocumentHelpConfigurationChanged } from '@jetlinks-web-core/hooks/useConfiguredDocumentHelp'
import { getDocumentHelpPoints } from '@jetlinks-web-core/utils/documentHelpRegistry'
import type { ConditionTerm } from '@jetlinks-web-core/components/ConditionFilter'
import { getDocumentHelpConfigurations, saveDocumentHelpConfiguration, updateDocumentHelpEnabled, type DocumentHelpConfiguration } from '../../../api/system/documentHelp'
import { filterHelpPoints, mergeHelpPoints, type DocumentHelpRow } from './model'

export function useDocumentManagement() {
  const { t, locale } = useI18n()
  const configurations = ref<DocumentHelpConfiguration[]>([])
  const revision = ref(0), loaded = ref(false), loading = ref(false), failed = ref(false)
  const scope = ref('all'), routeKeyword = ref(''), terms = ref<ConditionTerm[]>([])
  const draftEnabled = ref(true), updating = ref('')
  const selectedKeys = ref<string[]>([])
  const current = ref<DocumentHelpRow>(), draft = ref(''), saving = ref(false), saveFailed = ref(false)
  const points = computed(() => { locale.value; revision.value; return getDocumentHelpPoints() })
  const rows = computed(() => loaded.value ? mergeHelpPoints(points.value, configurations.value) : [])
  const filteredRows = computed(() => filterHelpPoints(rows.value, scope.value, terms.value))
  const nodes = computed(() => [
    { key: 'all', title: t('DocumentManagement.all'), count: rows.value.length },
    { key: 'ready', title: t('DocumentManagement.configured'), count: rows.value.filter(row => row.configured).length },
    { key: 'missing', title: t('DocumentManagement.missing'), count: rows.value.filter(row => !row.configured).length },
    ...[...new Set(rows.value.map(row => row.code))].map(code => ({
      key: `route:${code}`, title: points.value.find(point => point.code === code)!.page, code,
      count: rows.value.filter(row => row.code === code).length,
    })).filter(node => `${node.title} ${node.code}`.toLocaleLowerCase().includes(routeKeyword.value.trim().toLocaleLowerCase())),
  ])
  const title = computed(() => scope.value.startsWith('route:') ? scope.value.slice(6)
    : t(`DocumentManagement.${scope.value === 'ready' ? 'configured' : scope.value === 'missing' ? 'missing' : 'all'}`))

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
  return { rows, filteredRows, scope, routeKeyword, terms, nodes, title, loading, failed, loaded,
    current, draft, draftEnabled, saving, updating, selectedKeys, saveFailed, load, edit, close, save, toggleEnabled, batchToggle }
}
