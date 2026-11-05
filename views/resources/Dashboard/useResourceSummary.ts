import { computed, ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePrivateQuery } from '../../../visDashboard/Base/Private/usePrivateQuery'
import { useHomeNavigation } from '../../../visDashboard/Base/shared/useHomeNavigation'
import { createResourceSummaryCards, loadResourceSummary, visualizationSummaryKeys } from './services/resourceSummary'
import type { ResourcePageAccess } from './resourcePage.types'
import type { ResourceSummaryCard } from './resourceSummary.types'
import { buildDistributionBars } from './services/resourceDistribution'

/** 复用概览请求生命周期；范围或授权变化会丢弃旧数据，离页停止自动刷新。 */
export function useResourceSummary(access: Ref<ResourcePageAccess>, scope: Ref<string>) {
  const { t, locale } = useI18n()
  const visualizationKeys = computed(() => visualizationSummaryKeys(access.value))
  const definitions = computed(() => createResourceSummaryCards(access.value, visualizationKeys.value))
  const key = computed(() => JSON.stringify([scope.value, access.value, visualizationKeys.value]))
  const enabled = computed(() => definitions.value.length > 0)
  const query = usePrivateQuery(
    () => Promise.all(definitions.value.map(card => loadResourceSummary(card, access.value))), key, enabled,
  )
  const updatedAt = ref<number>()
  // 时间仅代表本次成功取得的资源统计；切换范围清空，不把页面打开时间伪装成数据时间。
  watch(() => query.data, data => {
    updatedAt.value = data?.some(card => !card.failed) ? Date.now() : undefined
  })
  const navigation = useHomeNavigation(ref(true), ref(false))
  const number = computed(() => new Intl.NumberFormat(locale.value))
  const cards = computed(() => (query.data ?? definitions.value).map(card => {
    const statuses = card.statuses.map(status => ({ ...status,
      label: t(status.labelKey),
      valueText: status.failed || status.value === undefined ? '—' : number.value.format(status.value),
    }))
    const expanded = !access.value.saas && definitions.value.length === 1 && card.id === 'collection'
    const colors = { success: 'var(--ant-color-success, #52c41a)', error: 'var(--ant-color-error, #ff4d4f)', default: 'var(--ant-color-text-quaternary, #bfbfbf)' }
    return { ...card, label: t(card.labelKey), unit: t(card.unitKey),
      valueText: card.failed || card.value === undefined ? '—' : number.value.format(card.value),
      interactive: navigation.canOpen(card.target),
      hasError: !!card.failed || card.statuses.some(status => status.failed), expanded,
      errorText: t(card.failed ? 'resourcePage.summary.loadError' : 'resourcePage.summary.partialError'), statuses,
      distributionRows: expanded ? buildDistributionBars(statuses.map(status => ({ id: status.key, name: status.label,
        value: status.value, failed: status.failed, color: colors[status.tone || 'default'] })), card.failed ? undefined : card.value,
        value => t('resourceDashboard.supplemental.itemCount', { count: number.value.format(value) }), value => `${value.toFixed(1)}%`) : [],
    }
  }))

  /** 菜单解析仍由统一导航承担，消息总量不伪造可下转入口。 */
  function open(card: ResourceSummaryCard) {
    navigation.open(card.target)
  }

  return { cards, updatedAt, loading: computed(() => query.loading), error: computed(() => query.error), refresh: query.refresh, open }
}
