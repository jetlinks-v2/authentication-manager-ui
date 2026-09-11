import { onUnmounted, ref, watch, type Ref } from 'vue'
import { loadHomeRows } from './api'
import { QUICK_ACTIONS } from './navigation'
import type { HomeFeature, HomeRow } from './types'
/** 每轮完成后再安排刷新；配置变更、离页时丢弃旧响应并清理定时器。 */
export function useHomeRuntime(
  feature: HomeFeature,
  isEdit: Ref<boolean>,
  refreshTime: Ref<number>,
  refreshKey: Ref<number> = ref(0)
) {
  const rows = ref<HomeRow[]>([]), loading = ref(false), error = ref(false)
  let generation = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  const stop = () => { if (timer) clearTimeout(timer); timer = undefined }
  watch([isEdit, refreshTime, refreshKey], () => {
    const version = ++generation
    stop()
    rows.value = []; error.value = false; loading.value = false
    if (feature === 'QuickActions') {
      rows.value = QUICK_ACTIONS.map(({ id, target }) => ({ id, labelKey: `action_${id}`, icon: id, target }))
      return
    }
    if (isEdit.value) return
    let settled = false
    const load = async () => {
      loading.value = !settled
      try {
        const result = await loadHomeRows(feature)
        if (version !== generation) return
        rows.value = result; error.value = result.length > 0 && result.every(row => row.failed)
      } catch {
        if (version !== generation) return
        rows.value = []; error.value = true
      } finally {
        if (version === generation) {
          loading.value = false; settled = true
          timer = setTimeout(load, Math.max(5, Number(refreshTime.value) || 60) * 1000)
        }
      }
    }
    void load()
  }, { immediate: true })
  onUnmounted(() => { generation++; stop() })
  return { rows, loading, error }
}
