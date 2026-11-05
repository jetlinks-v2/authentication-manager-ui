import { computed, nextTick, onMounted, ref, watch, type Ref } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { formatOverviewNumber } from '../Saas/components/presentation'
import type { PrivateAlarmLevel, PrivateAlarms } from './types'

export interface PrivateSummaryTag {
  id: string
  text: string
  tone?: PrivateAlarmLevel['tone']
}

/** 将告警等级和来源数量整理为同一种只读摘要标签。 */
export function usePrivateAlarmSummaryTags(data: Readonly<Ref<PrivateAlarms | undefined>>) {
  const { t, locale } = useI18n()
  const levels = computed<PrivateSummaryTag[]>(() => data.value?.levels.map(level => ({
    id: level.id,
    text: `${level.label} ${formatOverviewNumber(level.value, locale.value)}`,
    tone: level.tone,
  })) || [])
  const sources = computed<PrivateSummaryTag[]>(() => {
    const alarm = data.value
    if (!alarm) return []
    if (alarm.sources.length > 1) return alarm.sources.map(source => ({
      id: source.id,
      text: `${t(`privateOverview.source.${source.id}`)} ${formatOverviewNumber(source.today, locale.value)}`,
    }))
    return [{
      id: 'yesterday',
      text: `${t('privateOverview.yesterday')} ${formatOverviewNumber(alarm.sources[0]?.yesterday, locale.value)} ${t('privateOverview.unitRecords')}`,
    }]
  })
  return { levels, sources }
}

/** 根据标签和剩余数量的实际宽度，在一行内展示最多两个标签。 */
export function useVisiblePrivateSummaryTags(items: Readonly<Ref<PrivateSummaryTag[]>>) {
  const host = ref<HTMLElement>()
  const measurement = ref<HTMLElement>()
  const visibleCount = ref(2)
  const visibleItems = computed(() => items.value.slice(0, visibleCount.value))
  const hiddenItems = computed(() => items.value.slice(visibleCount.value))
  const hiddenCount = computed(() => hiddenItems.value.length)
  const accessibleLabel = computed(() => hiddenItems.value.map(item => item.text).join(', '))

  function measure() {
    const count = items.value.length
    if (count < 2) {
      visibleCount.value = count
      return
    }
    const container = host.value
    const ruler = measurement.value
    if (!container || !ruler || !container.clientWidth) return
    const tags = ruler.querySelectorAll<HTMLElement>('[data-measure-tag]')
    const more = ruler.querySelector<HTMLElement>('[data-measure-more]')
    if (!tags[0] || !tags[1] || !more) return
    const gap = Number.parseFloat(getComputedStyle(container).columnGap) || 0
    const required = tags[0].getBoundingClientRect().width + tags[1].getBoundingClientRect().width + gap
      + (count > 2 ? more.getBoundingClientRect().width + gap : 0)
    visibleCount.value = required <= container.clientWidth + 0.25 ? 2 : 1
  }

  useResizeObserver([host, measurement], measure)
  watch(items, () => { void nextTick(measure) }, { immediate: true, deep: true, flush: 'post' })
  onMounted(() => { void nextTick(measure) })
  return { host, measurement, visibleItems, hiddenItems, hiddenCount, accessibleLabel }
}
