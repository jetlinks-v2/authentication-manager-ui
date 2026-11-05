import { computed, getCurrentInstance, nextTick, onMounted, ref, watch, type Ref } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import type { PrivateAccountEntry } from './types'

/** 测量可用功能单行容纳数量，放不下时计算隐藏数量并提供 +n 浮层。 */
export function useVisibleAccountEntries(entries: Readonly<Ref<PrivateAccountEntry[]>>) {
  const containerRef = ref<HTMLElement>()
  const measurementRef = ref<HTMLElement>()
  const moreMeasureRef = ref<HTMLElement>()

  const visibleCount = ref(entries.value.length)

  const visibleEntries = computed(() => entries.value.slice(0, visibleCount.value))
  const hiddenCount = computed(() => Math.max(0, entries.value.length - visibleCount.value))

  function measure() {
    const total = entries.value.length
    if (total <= 1) {
      visibleCount.value = total
      return
    }
    const container = containerRef.value
    const ruler = measurementRef.value
    if (!container || !ruler || !container.clientWidth) return

    const itemEls = ruler.querySelectorAll<HTMLElement>('[data-measure-item]')
    if (!itemEls.length) return

    const moreWidth = moreMeasureRef.value?.getBoundingClientRect().width || 32
    const containerWidth = container.clientWidth
    const gap = 6

    let totalWidth = 0
    for (let i = 0; i < itemEls.length; i++) {
      totalWidth += itemEls[i].getBoundingClientRect().width + (i > 0 ? gap : 0)
    }

    if (totalWidth <= containerWidth) {
      visibleCount.value = total
      return
    }

    const availableWidth = Math.max(0, containerWidth - moreWidth - gap)
    let used = 0
    let fit = 0

    for (let i = 0; i < itemEls.length; i++) {
      const w = itemEls[i].getBoundingClientRect().width + (i > 0 ? gap : 0)
      if (used + w > availableWidth) break
      used += w
      fit++
    }

    visibleCount.value = Math.max(1, Math.min(fit, total - 1))
  }

  useResizeObserver([containerRef, measurementRef], measure)
  watch(entries, () => { void nextTick(measure) }, { immediate: true, deep: true, flush: 'post' })
  if (getCurrentInstance()) {
    onMounted(() => { void nextTick(measure) })
  }

  return {
    containerRef,
    measurementRef,
    moreMeasureRef,
    visibleEntries,
    hiddenCount,
    measure,
  }
}
