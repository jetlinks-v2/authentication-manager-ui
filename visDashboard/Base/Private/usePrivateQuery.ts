import { onActivated, onDeactivated, onScopeDispose, reactive, ref, shallowRef, watch, type Ref } from 'vue'

/** 概览分区独立刷新；账号、能力及筛选切换立即废弃旧结果，离页停止轮询。 */
export function usePrivateQuery<T>(load: () => Promise<T>, key: Readonly<Ref<string>>, enabled: Readonly<Ref<boolean>>) {
  const data = shallowRef<T>()
  const loading = ref(false), error = ref(false), active = ref(true)
  let revision = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  async function refresh() {
    clearTimeout(timer)
    const current = ++revision
    if (!active.value || !enabled.value) { loading.value = false; return }
    loading.value = true
    error.value = false
    try {
      const result = await load()
      if (current === revision) data.value = result
    } catch {
      if (current === revision) { data.value = undefined; error.value = true }
    } finally {
      if (current === revision) {
        loading.value = false
        timer = setTimeout(refresh, 60000)
      }
    }
  }
  watch([key, enabled, active], () => {
    ++revision; clearTimeout(timer)
    data.value = undefined; error.value = false; loading.value = false
    if (active.value && enabled.value) void refresh()
  }, { immediate: true })
  onActivated(() => { active.value = true })
  onDeactivated(() => { active.value = false; ++revision; clearTimeout(timer) })
  onScopeDispose(() => { active.value = false; ++revision; clearTimeout(timer) })
  return reactive({ data, loading, error, refresh })
}
