import { computed, onActivated, onDeactivated, onScopeDispose, ref, shallowRef, watch, type Component, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDocumentVisibility } from '@vueuse/core'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { moduleRegistry } from '@jetlinks-web-core/utils/module-registry'
import { useResourceCapabilities } from './useResourceCapabilities'
import { settingsOf, type ResourceInfo } from '../shared'
import type { ResourceRankRow } from '../components/resourceRank'
import { loadVisionTaskRanking, visionRankingMetrics, type VisionRankingMetric, type VisionTaskRank, type VisionTaskRankingCache } from '../services/visionTaskRanking'

export interface VisionTaskRankRow extends VisionTaskRank, ResourceRankRow {}

export function useVisionTaskRanking(info: Ref<ResourceInfo | undefined>, isEdit: Ref<boolean>) {
  const { t } = useI18n()
  const menu = useMenuStore()
  const preview = computed(() => isEdit.value || Boolean(info.value?.componentProps?.preview))
  const capabilities = useResourceCapabilities(preview)
  const available = computed(() => capabilities.modules.value.edge && capabilities.modules.value.vision)
  const config = computed(() => settingsOf('VisionTaskRanking', info.value))
  const title = computed(() => noTasks.value ? t('resourceDashboard.visionRanking.tasksTitle') : config.value.title || t('resourceDashboard.VisionTaskRanking'))
  const metric = ref<VisionRankingMetric>('latency')
  const tabs = computed(() => visionRankingMetrics.map(value => ({ value, label: t(`resourceDashboard.visionRanking.${value}`) })))
  const data = shallowRef<VisionTaskRank[]>([])
  const loading = ref(false), error = ref(false), metadataFailed = ref(false), limited = ref(false)
  const selected = shallowRef<VisionTaskRank>()
  const active = ref(true), visibility = useDocumentVisibility()
  const unsupported = ref(false), unit = ref('')
  const taskCount = ref<number>(), directoryIncomplete = ref(false)
  const noTasks = computed(() => taskCount.value === 0 && data.value.length === 0 && !directoryIncomplete.value)
  const metricCaption = computed(() => t(`resourceDashboard.visionRanking.${metric.value === 'discard' ? 'incrementWindow' : 'latestWindow'}`))
  // 按产品确认的展示口径固定耗时后缀，数值不换算；其他指标仍使用接口单位。
  const metricUnit = computed(() => metric.value === 'latency' ? 'ms' : unit.value)
  const rows = computed<VisionTaskRankRow[]>(() => {
    // 离线历史值不冒充当前值；有任务但无指标时保留身份，不参与排名。
    const valueOf = (item: VisionTaskRank) => item.online === false ? undefined : item.value
    const sorted = [...data.value].sort((a, b) => Number(a.online === false) - Number(b.online === false)
      || Number(valueOf(b) !== undefined) - Number(valueOf(a) !== undefined) || (valueOf(b) ?? 0) - (valueOf(a) ?? 0))
    const max = Math.max(1, ...sorted.map(item => valueOf(item) ?? 0))
    let rank = 0
    return sorted.map(item => {
      const value = valueOf(item)
      const identity = [item.sceneName, item.algorithmName].filter(Boolean)
      // 优先显示真实任务名；元数据缺失时保留算法或任务 ID，避免已有指标却只显示横线。
      const name = item.name.trim()
      const label = (name && name !== item.taskId ? name : identity.join(' · ')) || item.taskId || '—'
      return { ...item, rank: value === undefined ? 0 : ++rank, width: value === undefined ? 0 : Math.min(100, value / max * 100),
        detailAvailable: item.detailAvailable && item.online !== false && Boolean(item.gatewayId && item.taskId),
        label, caption: item.gatewayName,
        tooltip: [...new Set([item.gatewayName, label, ...identity].filter(Boolean))].join(' · '),
        text: item.online === false ? t('resourceDashboard.offline') : value === undefined ? t('resourceDashboard.gatewayStatus.metricMissing')
          : `${Number(value.toFixed(2))}${metricUnit.value ? ` ${metricUnit.value === 'percent' ? '%' : metricUnit.value === 'count' ? t('resourceDashboard.visionRanking.records') : metricUnit.value}` : ''}`,
        color: item.online === false ? '#ff4d4f' : value === undefined || value === 0 ? '#bfbfbf' : undefined }
    })
  })
  const cardRows = computed(() => rows.value.slice(0, config.value.limit))
  // 聚合按任务及来源分组且受 Top50 限制，只有完整目录才能称为任务总数。
  const countCaption = computed(() => {
    const count = taskCount.value === undefined
      ? t(limited.value ? 'resourceDashboard.visionRanking.limitedItems' : 'resourceDashboard.visionRanking.returnedItems', { count: rows.value.length })
      : t('resourceDashboard.visionRanking.taskCount', { count: taskCount.value })
    return cardRows.value.length < rows.value.length ? `${t('resourceDashboard.visionRanking.shownItems', { count: cardRows.value.length })} · ${count}` : count
  })
  const configureTarget = computed(() => ['algorithm-center', 'project/algorithm-center'].find(code => !!menu.getMenu(code)))
  const canConfigure = computed(() => available.value && !preview.value && !!configureTarget.value)
  const detailComponent = computed(() => available.value
    ? moduleRegistry.getResourceItem<Component>('jetlinks-ai-ui', 'components', 'GatewayVisionTaskDetail') : undefined)
  const canOpenDetail = computed(() => available.value && active.value && !preview.value && !!detailComponent.value)
  let generation = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let cache: VisionTaskRankingCache = {}, cachedAt = 0
  const enabled = () => available.value && active.value && (preview.value || visibility.value === 'visible')

  /** 仅纯指标切换复用一分钟内的目录；主动重试和定时刷新仍重新查询全部数据。 */
  async function refresh(reuseMetadata = false) {
    const current = ++generation
    clearTimeout(timer)
    const now = Date.now()
    if (!reuseMetadata || now - cachedAt >= 60_000) { cache = {}; cachedAt = now }
    loading.value = false; error.value = false; unsupported.value = false; taskCount.value = undefined; directoryIncomplete.value = false
    if (!enabled()) { data.value = []; return }
    loading.value = true
    const isCurrent = () => current === generation && enabled()
    try {
      const result = preview.value
        ? { rows: previewRows(), metadataFailed: false, limited: false, supported: true, unit: metric.value === 'latency' ? 'ms' : 'count', taskCount: 8, directoryIncomplete: false }
        : await loadVisionTaskRanking(metric.value, isCurrent, cache)
      if (!isCurrent()) return
      data.value = result.rows; metadataFailed.value = result.metadataFailed; limited.value = result.limited
      unsupported.value = !result.supported; unit.value = result.unit
      taskCount.value = result.taskCount; directoryIncomplete.value = Boolean(result.directoryIncomplete)
    } catch {
      if (isCurrent()) { error.value = true; data.value = [] }
    } finally {
      if (current === generation) {
        loading.value = false
        if (enabled() && !preview.value && config.value.refreshSeconds) timer = setTimeout(refresh, config.value.refreshSeconds * 1000)
      }
    }
  }
  watch([metric, preview, available, capabilities.scope, active, visibility, () => config.value.refreshSeconds], ([nextMetric, ...context], [previousMetric, ...previousContext]) => {
    ++generation; clearTimeout(timer)
    data.value = []; metadataFailed.value = false; limited.value = false; unsupported.value = false; unit.value = ''
    selected.value = undefined
    // 账号、项目、权限、可见性等上下文变化必须重新取目录。
    void refresh(nextMetric !== previousMetric && context.every((value, index) => value === previousContext[index]))
  }, { immediate: true, flush: 'sync' })
  onActivated(() => { active.value = true })
  onDeactivated(() => { active.value = false })
  onScopeDispose(() => { ++generation; clearTimeout(timer) })
  function openTask(row: VisionTaskRank) {
    if (!canOpenDetail.value || !row.detailAvailable || row.online === false || !row.gatewayId || !row.taskId) return
    selected.value = row
  }
  function configure() {
    if (canConfigure.value && configureTarget.value) menu.jumpPage(configureTarget.value)
  }
  function previewRows(): VisionTaskRank[] {
    return [486, 412, 375, 308, 256, 198, 142, 96].map((value, index) => ({
      id: `preview-${index}`, gatewayId: `preview-${index % 3}`, taskId: `preview-${index}`,
      gatewayName: t('resourceDashboard.visionRanking.previewGateway', { index: index % 3 + 1 }),
      name: t('resourceDashboard.visionRanking.previewTask', { index: index + 1 }), sourceName: '',
      sceneName: t('resourceDashboard.visionRanking.previewScene', { index: index % 3 + 1 }),
      algorithmName: t('resourceDashboard.visionRanking.previewAlgorithm', { index: index + 1 }),
      value: metric.value === 'latency' ? value : Math.floor(value / 10), detailAvailable: false,
    }))
  }
  return { title, metric, tabs, rows, cardRows, loading, error, metadataFailed, limited, available, unsupported,
    noTasks, directoryIncomplete, metricCaption, countCaption,
    canConfigure, canOpenDetail, detailComponent, selected, preview, refresh, openTask, configure }
}
