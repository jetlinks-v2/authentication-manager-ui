import { onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import { handleQuickAlarm, queryQuickAlarm, queryQuickAlarms, type AlarmCategory, type QuickAlarm } from './alarmService'

/** 管理展开、分页与处理状态；关闭及卸载时丢弃迟到响应，提交失败保留填写内容。 */
export function useQuickAlarms(category: AlarmCategory, handled: () => void) {
  const { t } = useI18n()
  const open = ref(false), loading = ref(false), error = ref(false)
  const rows = ref<QuickAlarm[]>([]), page = ref(1), total = ref(0)
  const selected = ref<QuickAlarm>(), detailLoading = ref(false), detailError = ref(false)
  const submitting = ref(false), submitError = ref(false)
  let listVersion = 0, detailVersion = 0, disposed = false
  async function load(nextPage = page.value) {
    const version = ++listVersion
    page.value = nextPage; loading.value = true; error.value = false; rows.value = []
    try {
      const result = await queryQuickAlarms(category, nextPage)
      if (disposed || version !== listVersion) return
      rows.value = result.rows; total.value = result.total
    } catch { if (!disposed && version === listVersion) error.value = true }
    finally { if (!disposed && version === listVersion) loading.value = false }
  }
  function setOpen(value: boolean) {
    open.value = value
    if (value) void load(1)
    else { listVersion++; loading.value = false }
  }
  async function select(alarm: QuickAlarm) {
    setOpen(false)
    const version = ++detailVersion
    selected.value = alarm; detailLoading.value = true; detailError.value = false; submitError.value = false
    try {
      const result = await queryQuickAlarm(category, alarm.id)
      if (!disposed && version === detailVersion) selected.value = result
    } catch { if (!disposed && version === detailVersion) detailError.value = true }
    finally { if (!disposed && version === detailVersion) detailLoading.value = false }
  }
  function close() {
    if (submitting.value) return
    detailVersion++; selected.value = undefined
  }
  async function submit(describe: string) {
    if (!selected.value || submitting.value || detailLoading.value || detailError.value) return
    submitting.value = true; submitError.value = false
    try {
      await handleQuickAlarm(category, selected.value, describe)
      if (disposed) return
      selected.value = undefined
      message.success(t('packages.ProjectHome.alarmHandled'))
      handled()
    } catch { if (!disposed) submitError.value = true }
    finally { if (!disposed) submitting.value = false }
  }
  onUnmounted(() => { disposed = true; listVersion++; detailVersion++ })
  return { open, loading, error, rows, page, total, selected, detailLoading, detailError, submitting, submitError,
    load, setOpen, select, close, submit }
}
