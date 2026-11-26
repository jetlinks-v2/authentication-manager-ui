import { onActivated, onDeactivated, onScopeDispose, reactive, ref, shallowRef, watch, type Ref } from 'vue'

/** 概览分区独立刷新；账号、能力及筛选切换立即废弃旧结果，离页停止轮询。 */
export function usePrivateQuery<T>(load: () => Promise<T>, key: Readonly<Ref<string>>, enabled: Readonly<Ref<boolean>>,
  options: { retainOnError?: boolean; retryIntervalMs?: number } = {}) {
  const data = shallowRef<T>()
  const loading = ref(false), error = ref(false), active = ref(true)
  let revision = 0
  let failures = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  async function refresh() {
    clearTimeout(timer)
    const current = ++revision
    if (!active.value || !enabled.value) { loading.value = false; return }
    loading.value = true
    error.value = false
    let denied = false
    try {
      const result = await load()
      if (current === revision) { data.value = result; failures = 0 }
    } catch (reason) {
      const failure = reason as { status?: number; response?: { status?: number } }
      denied = [401, 403].includes(Number(failure?.status ?? failure?.response?.status))
      if (current === revision) {
        if (!options.retainOnError || denied) data.value = undefined
        error.value = true; failures++
      }
    } finally {
      if (current === revision) {
        loading.value = false
        // 实时卡片的目录短暂失败保留同身份旧值并快速恢复，其他概览仍沿用分钟刷新。
        if (!(denied && options.retryIntervalMs)) timer = setTimeout(refresh, error.value && options.retryIntervalMs
          ? Math.min(30000, options.retryIntervalMs * 2 ** Math.min(failures - 1, 4)) : 60000)
      }
    }
  }
  watch([key, enabled, active], () => {
    ++revision; clearTimeout(timer)
    data.value = undefined; error.value = false; loading.value = false; failures = 0
    if (active.value && enabled.value) void refresh()
  }, { immediate: true })
  onActivated(() => { active.value = true })
  onDeactivated(() => { active.value = false; ++revision; clearTimeout(timer) })
  onScopeDispose(() => { active.value = false; ++revision; clearTimeout(timer) })
  return reactive({ data, loading, error, refresh })
}
