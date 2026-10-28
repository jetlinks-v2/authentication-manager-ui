import { computed, onActivated, onDeactivated, onScopeDispose, ref, shallowRef, watch, type Component, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDocumentVisibility } from '@vueuse/core'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { moduleRegistry } from '@jetlinks-web-core/utils/module-registry'
import { useResourceCapabilities } from './useResourceCapabilities'
import { settingsOf, type ResourceInfo } from '../shared'
import type { ResourceRankRow } from '../components/resourceRank'
import { loadVisionTaskRanking, visionRankingMetrics, type VisionRankingMetric, type VisionTaskRank } from '../services/visionTaskRanking'

export interface VisionTaskRankRow extends VisionTaskRank, ResourceRankRow {}

export function useVisionTaskRanking(info: Ref<ResourceInfo | undefined>, isEdit: Ref<boolean>) {
  const { t } = useI18n()
  const menu = useMenuStore()
  const preview = computed(() => isEdit.value || Boolean(info.value?.componentProps?.preview))
  const capabilities = useResourceCapabilities(preview)
  const available = computed(() => capabilities.modules.value.edge && capabilities.modules.value.vision)
  const config = computed(() => settingsOf('VisionTaskRanking', info.value))
  const title = computed(() => config.value.title || t('resourceDashboard.VisionTaskRanking'))
  const metric = ref<VisionRankingMetric>('latency')
  const tabs = computed(() => visionRankingMetrics.map(value => ({ value, label: t(`resourceDashboard.visionRanking.${value}`) })))
  const data = shallowRef<VisionTaskRank[]>([])
  const loading = ref(false), error = ref(false), metadataFailed = ref(false), limited = ref(false)
  const moreOpen = ref(false), expanded = ref<string[]>([])
  const selected = shallowRef<VisionTaskRank>()
  const active = ref(true), visibility = useDocumentVisibility()
  const unsupported = ref(false), unit = ref('')
  const rows = computed<VisionTaskRankRow[]>(() => {
    const max = Math.max(1, ...data.value.map(item => item.value))
    return data.value.map((item, index) => ({ ...item, rank: index + 1, width: Math.min(100, item.value / max * 100),
      label: [item.name, item.sourceName].filter(Boolean).join(' · '), caption: item.gatewayName,
      tooltip: [item.gatewayName, item.name, item.sourceName].filter(Boolean).join(' · '),
      text: `${Number(item.value.toFixed(2))}${unit.value ? ` ${unit.value === 'percent' ? '%' : unit.value === 'count' ? t('resourceDashboard.visionRanking.records') : unit.value}` : ''}` }))
  })
  const cardRows = computed(() => rows.value.slice(0, config.value.limit))
  const groups = computed(() => [...new Set(rows.value.map(row => row.gatewayId))].map(id => ({
    id, name: rows.value.find(row => row.gatewayId === id)!.gatewayName, rows: rows.value.filter(row => row.gatewayId === id),
  })))
  const allExpanded = computed(() => groups.value.length > 0 && groups.value.every(group => expanded.value.includes(group.id)))
  const allCollapsed = computed(() => groups.value.length > 0 && expanded.value.length === 0)
  function setGroupsExpanded(value: boolean) {
    expanded.value = value ? groups.value.map(group => group.id) : []
  }
  const detailComponent = computed(() => available.value
    ? moduleRegistry.getResourceItem<Component>('jetlinks-ai-ui', 'components', 'GatewayVisionTaskDetail') : undefined)
  const canConfigure = computed(() => available.value && !preview.value && !!menu.getMenu('algorithm-center'))
  const canConfigureGateway = computed(() => available.value && !preview.value && !!menu.getMenu('iot-user-device-list/GatewayDetail'))
  let generation = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  const enabled = () => available.value && active.value && (preview.value || visibility.value === 'visible')

  async function refresh() {
    const current = ++generation
    clearTimeout(timer)
    loading.value = false; error.value = false; unsupported.value = false
    if (!enabled()) { data.value = []; return }
    loading.value = true
    const isCurrent = () => current === generation && enabled()
    try {
      const result = preview.value
        ? { rows: previewRows(), metadataFailed: false, limited: false, supported: true, unit: metric.value === 'latency' ? 'ms' : 'count' }
        : await loadVisionTaskRanking(metric.value, isCurrent)
      if (!isCurrent()) return
      data.value = result.rows; metadataFailed.value = result.metadataFailed; limited.value = result.limited
      unsupported.value = !result.supported; unit.value = result.unit
    } catch {
      if (isCurrent()) { error.value = true; data.value = [] }
    } finally {
      if (current === generation) {
        loading.value = false
        if (enabled() && !preview.value && config.value.refreshSeconds) timer = setTimeout(refresh, config.value.refreshSeconds * 1000)
      }
    }
  }
  watch([metric, preview, available, capabilities.scope, active, visibility, () => config.value.refreshSeconds], () => {
    ++generation; clearTimeout(timer)
    data.value = []; metadataFailed.value = false; limited.value = false; unsupported.value = false; unit.value = ''
    selected.value = undefined
    if (!available.value || !active.value) moreOpen.value = false
    void refresh()
  }, { immediate: true, flush: 'sync' })
  watch(moreOpen, open => { expanded.value = open ? groups.value.map(group => group.id) : [] })
  // 刷新保留用户的展开选择；首次加载或切换后新增的网关默认展开。
  watch(groups, (next, previous) => {
    if (!moreOpen.value) return
    const currentIds = new Set(next.map(group => group.id)), previousIds = new Set(previous.map(group => group.id))
    expanded.value = [...expanded.value.filter(id => currentIds.has(id)), ...next.filter(group => !previousIds.has(group.id)).map(group => group.id)]
  })
  onActivated(() => { active.value = true })
  onDeactivated(() => { active.value = false })
  onScopeDispose(() => { ++generation; clearTimeout(timer) })
  function openTask(row: VisionTaskRank) {
    if (available.value && !preview.value && row.detailAvailable && detailComponent.value) selected.value = row
  }
  function configure(gatewayId?: string) {
    if (gatewayId ? !canConfigureGateway.value : !canConfigure.value) return
    moreOpen.value = false; selected.value = undefined
    if (gatewayId) menu.jumpPage('iot-user-device-list/GatewayDetail', { params: { gatewayId }, query: { type: 'gateway', tab: 'visionModels' } })
    else menu.jumpPage('algorithm-center')
  }
  function previewRows(): VisionTaskRank[] {
    return [486, 412, 375, 308, 256, 198, 142, 96].map((value, index) => ({
      id: `preview-${index}`, gatewayId: `preview-${index % 3}`, taskId: `preview-${index}`,
      gatewayName: t('resourceDashboard.visionRanking.previewGateway', { index: index % 3 + 1 }),
      name: t('resourceDashboard.visionRanking.previewTask', { index: index + 1 }), sourceName: '',
      value: metric.value === 'latency' ? value : Math.floor(value / 10), detailAvailable: false,
    }))
  }
  return { title, metric, tabs, rows, cardRows, groups, loading, error, metadataFailed, limited, available, unsupported,
    moreOpen, expanded, allExpanded, allCollapsed, setGroupsExpanded, selected, detailComponent, canConfigure, canConfigureGateway, preview, refresh, openTask, configure }
}
