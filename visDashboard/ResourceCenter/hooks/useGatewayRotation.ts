import { onScopeDispose, ref, watch, type Ref } from 'vue'

interface GatewayRotationOptions {
  ids: Readonly<Ref<string[]>>
  selectedId: Ref<string>
  enabled: Readonly<Ref<boolean>>
}

/** 每项展示5秒；交互、加载和页面隐藏期间暂停，恢复时重新计时。 */
export function useGatewayRotation({ ids, selectedId, enabled }: GatewayRotationOptions) {
  const hovering = ref(false)
  const keyboardFocused = ref(false)
  const rankingList = ref<HTMLElement>()
  let timer: ReturnType<typeof setTimeout> | undefined

  const stop = () => { clearTimeout(timer); timer = undefined }
  const schedule = () => {
    stop()
    if (!enabled.value || hovering.value || keyboardFocused.value || ids.value.length < 2) return
    timer = setTimeout(() => {
      const index = ids.value.indexOf(selectedId.value)
      selectedId.value = ids.value[(index + 1) % ids.value.length]
    }, 5000)
  }
  watch([ids, selectedId, enabled, hovering, keyboardFocused], schedule, { immediate: true, flush: 'sync' })
  watch(selectedId, () => {
    const list = rankingList.value
    const selected = list?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!list || !selected) return
    const bounds = list.getBoundingClientRect(), row = selected.getBoundingClientRect()
    if (row.top < bounds.top) list.scrollTop += row.top - bounds.top
    else if (row.bottom > bounds.bottom) list.scrollTop += row.bottom - bounds.bottom
  }, { flush: 'post' })
  onScopeDispose(stop)

  return {
    rankingList,
    onPointerEnter: () => { hovering.value = true },
    onPointerLeave: () => { hovering.value = false },
    onFocusIn: (event: FocusEvent) => {
      keyboardFocused.value = Boolean((event.target as HTMLElement | null)?.matches(':focus-visible'))
    },
    onFocusOut: (event: FocusEvent) => {
      if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) keyboardFocused.value = false
    },
  }
}
