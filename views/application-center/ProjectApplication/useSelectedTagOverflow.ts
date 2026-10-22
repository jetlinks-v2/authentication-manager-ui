import { computed, onScopeDispose, ref, watch } from 'vue'

/** 为末尾的 +N 预留位置；先判断完整列表，避免本可显示全部时误折叠。 */
export const getSelectedTagLayout = (widths: number[], width: number, moreWidth: number, gap: number, maxLines = 2) => {
  const place = (used: number, line: number, itemWidth: number) => used && used + gap + itemWidth > width
    ? { used: itemWidth, line: line + 1 } : { used: used + (used ? gap : 0) + itemWidth, line }
  let all = { used: 0, line: 0 }
  for (const itemWidth of widths) all = place(all.used, all.line, itemWidth)
  if (all.line < maxLines) return { count: widths.length, left: 0, line: 0 }
  let current = { used: 0, line: 0 }
  let count = 0
  for (const itemWidth of widths) {
    const next = place(current.used, current.line, itemWidth)
    if (place(next.used, next.line, moreWidth).line >= maxLines) break
    current = next
    count++
  }
  const more = place(current.used, current.line, moreWidth)
  return { count, left: more.used - moreWidth, line: more.line }
}

/** 隐藏的标签继续参与测量，宽度变化、回查名称和删除选项均可重新计算。 */
export const useSelectedTagOverflow = (items: () => readonly unknown[]) => {
  const container = ref<HTMLElement>()
  const moreMeasure = ref<HTMLElement>()
  const layout = ref({ count: 0, left: 0, top: 0, height: 48 })
  let observer: ResizeObserver | undefined
  const measure = () => {
    const element = container.value
    if (!element?.clientWidth || !moreMeasure.value) return
    const tags = [...element.querySelectorAll<HTMLElement>('[data-selection-tag]')]
    if (!tags.length) return
    const style = getComputedStyle(element)
    const columnGap = parseFloat(style.columnGap) || 0
    const rowGap = parseFloat(style.rowGap) || 0
    const height = tags[0].getBoundingClientRect().height
    const next = getSelectedTagLayout(tags.map(tag => tag.getBoundingClientRect().width), element.clientWidth,
      moreMeasure.value.getBoundingClientRect().width, columnGap)
    layout.value = { count: next.count, left: next.left, top: next.line * (height + rowGap), height: 2 * height + rowGap }
  }
  watch(container, element => {
    observer?.disconnect()
    if (element) {
      observer = new ResizeObserver(measure)
      observer.observe(element)
      measure()
    }
  }, { flush: 'post' })
  watch(items, measure, { flush: 'post' })
  onScopeDispose(() => observer?.disconnect())
  const hiddenCount = computed(() => Math.max(0, items().length - layout.value.count))
  return { container, moreMeasure, layout, hiddenCount }
}
