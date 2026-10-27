import { onDeactivated, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import { handleQuickAlarm, queryQuickAlarm, queryQuickAlarms, type AlarmCategory, type QuickAlarm, type QuickAlarmQueryTerm } from './alarmService'

interface QuickAlarmOptions {
  terms?: () => readonly QuickAlarmQueryTerm[]
  scope?: () => string | undefined
  disabled?: () => boolean
}

/** 管理展开、分页与处理状态；关闭及卸载时丢弃迟到响应，提交失败保留填写内容。 */
export function useQuickAlarms(category: AlarmCategory, handled: () => void, options: QuickAlarmOptions = {}) {
  const { t } = useI18n()
  const open = ref(false), loading = ref(false), error = ref(false)
  const rows = ref<QuickAlarm[]>([]), page = ref(1), total = ref(0)
  const selected = ref<QuickAlarm>(), detailLoading = ref(false), detailError = ref(false)
  const submitting = ref(false), submitError = ref(false)
  let listVersion = 0, detailVersion = 0, scopeVersion = 0, disposed = false
  async function load(nextPage = page.value) {
    if (options.disabled?.()) return
    const version = ++listVersion
    page.value = nextPage; loading.value = true; error.value = false; rows.value = []
    try {
      const result = await queryQuickAlarms(category, nextPage, options.terms?.())
      if (disposed || version !== listVersion) return
      rows.value = result.rows; total.value = result.total
    } catch { if (!disposed && version === listVersion) error.value = true }
    finally { if (!disposed && version === listVersion) loading.value = false }
  }
  function setOpen(value: boolean) {
    if (value && options.disabled?.()) return
    open.value = value
    if (value) void load(1)
    else { listVersion++; loading.value = false }
  }
  async function select(alarm: QuickAlarm) {
    if (options.disabled?.()) return
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
    if (!selected.value || submitting.value || detailLoading.value || detailError.value || options.disabled?.()) return
    const version = scopeVersion
    submitting.value = true; submitError.value = false
    try {
      await handleQuickAlarm(category, selected.value, describe)
      if (disposed || version !== scopeVersion) return
      selected.value = undefined
      message.success(t('packages.ProjectHome.alarmHandled'))
      handled()
    } catch { if (!disposed && version === scopeVersion) submitError.value = true }
    finally { if (!disposed && version === scopeVersion) submitting.value = false }
  }
  // 调用方只在账号 / 项目 / 显式时间筛选变化时换 scope，普通刷新不清空处理草稿。
  function invalidate() {
    scopeVersion++; listVersion++; detailVersion++
    open.value = false; selected.value = undefined; rows.value = []
    loading.value = false; detailLoading.value = false; submitting.value = false
    error.value = false; detailError.value = false; submitError.value = false
  }
  if (options.scope) {
    watch(options.scope, invalidate)
    onDeactivated(invalidate)
  }
  onUnmounted(() => { disposed = true; scopeVersion++; listVersion++; detailVersion++ })
  return { open, loading, error, rows, page, total, selected, detailLoading, detailError, submitting, submitError,
    load, setOpen, select, close, submit }
}
