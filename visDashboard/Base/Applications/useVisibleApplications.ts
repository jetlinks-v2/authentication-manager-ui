import { nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import type { HomeRow } from '../shared/types'

/** 测量实际行高，只展示完整落在列表区域内的应用。 */
export function useVisibleApplications(rows: Readonly<Ref<HomeRow[]>>, enabled: Readonly<Ref<boolean>>) {
  const host = ref<HTMLElement>()
  const visibleCount = ref(Number.POSITIVE_INFINITY)
  let observer: ResizeObserver | undefined
  let active = false

  function measure() {
    const container = host.value
    if (!enabled.value || !container || !container.clientHeight) return
    const bottom = container.getBoundingClientRect().bottom - (parseFloat(getComputedStyle(container).paddingBottom) || 0)
    const items = Array.from(container.children).filter((element): element is HTMLElement => element instanceof HTMLElement && element.classList.contains('home-app-trigger'))
    const firstHidden = items.findIndex(item => item.getBoundingClientRect().bottom > bottom + 0.5)
    visibleCount.value = firstHidden < 0 ? items.length : firstHidden
  }

  async function observe() {
    await nextTick()
    if (!active) return
    observer?.disconnect()
    if (!enabled.value) { visibleCount.value = Number.POSITIVE_INFINITY; return }
    const container = host.value
    if (!container) return
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measure)
      observer.observe(container)
      Array.from(container.children).forEach(item => observer?.observe(item))
    }
    measure()
  }

  watch([host, rows, enabled], observe, { flush: 'post' })
  onMounted(() => { active = true; window.addEventListener('resize', measure); void observe() })
  onBeforeUnmount(() => { active = false; observer?.disconnect(); window.removeEventListener('resize', measure) })
  return { host, visibleCount }
}
