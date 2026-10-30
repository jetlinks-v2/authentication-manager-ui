import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import type { HomeRow } from '../shared/types'
import { formatOverviewNumber, quotaPercent } from './components/presentation'

export interface QuotaExpansionForm { quotaId: string; amount: number | null; note: string }
export interface QuotaExpansionView {
  form: QuotaExpansionForm
  isMock: boolean
  options: { value: string; label: string; disabled: boolean }[]
  unit: string
  usage: string
  percent?: number
  nextLimit: string
  error: string
  canSubmit: boolean
}

/** 没有可扩容项时仅供申请表单演示，取自概览原型，不写入真实套餐用量。 */
const MOCK_QUOTAS: HomeRow[] = [
  { id: 'mock:device', labelKey: 'saasDevices', value: 0, limit: 500, unitKey: 'saasUnitDevices' },
  { id: 'mock:video', labelKey: 'saasVideo', value: 0, limit: 200, unitKey: 'saasUnitChannels' },
  { id: 'mock:gateway', labelKey: 'saasGateway', value: 0, limit: 12, unitKey: 'saasUnitDevices' },
  { id: 'mock:screen', labelKey: 'saasScreen', value: 0, limit: 20, unitKey: 'saasUnitItems' },
  { id: 'mock:algorithm', labelKey: 'saasAlgorithm', value: 0, limit: 8, unitKey: 'saasUnitItems' },
  { id: 'mock:application', labelKey: 'saasExpansionApplication', value: 0, limit: 5, unitKey: 'saasUnitItems' },
  { id: 'mock:storage', labelKey: 'saasBillingStorage', value: 0, limit: 5, unitKey: 'saasBillingTB' },
  { id: 'mock:message', labelKey: 'saasExpansionMonthlyMessages', value: 0, limit: 3000, unitKey: 'saasExpansionMessageUnit' },
  { id: 'mock:api', labelKey: 'saasExpansionDailyApi', value: 0, limit: 10, unitKey: 'saasExpansionApiUnit' },
  { id: 'mock:member', labelKey: 'saasBillingMembers', value: 0, limit: 20, unitKey: 'saasBillingPeople' },
]

/** Ant 控件兼容多种 value 类型，表单只接收单选 ID 和有效数值输入。 */
export function quotaSelection(value: unknown): Partial<QuotaExpansionForm> {
  return { quotaId: typeof value === 'string' ? value : '' }
}
export function quotaAmount(value: unknown): Partial<QuotaExpansionForm> {
  return { amount: typeof value === 'number' ? value : null }
}

/** 优先展示已加载额度，缺失时使用演示数据；提交只反馈成功，不请求接口或修改套餐。 */
export function useQuotaExpansion(isEdit: () => boolean) {
  const { t, locale } = useI18n()
  const visible = ref(false)
  const isMock = ref(false)
  const quotas = ref<HomeRow[]>([])
  const submitted = ref(false)
  const form = reactive<QuotaExpansionForm>({ quotaId: '', amount: 1, note: '' })
  const selected = computed(() => quotas.value.find(row => row.id === form.quotaId))
  const expandable = (row?: HomeRow) => !!row && !row.failed && typeof row.limit === 'number' && Number.isFinite(row.limit) && row.limit >= 0
  const validAmount = computed(() => typeof form.amount === 'number' && Number.isInteger(form.amount)
    && form.amount > 0 && form.amount <= 999999)
  const view = computed<QuotaExpansionView>(() => {
    const row = selected.value
    const unit = row?.unit || (row?.unitKey ? t(`packages.ProjectHome.${row.unitKey}`) : '')
    return {
      form, isMock: isMock.value,
      options: quotas.value.map(item => ({ value: item.id,
        label: item.label || (item.labelKey ? t(`packages.ProjectHome.${item.labelKey}`) : item.id),
        disabled: !expandable(item) })),
      unit,
      usage: row ? `${formatOverviewNumber(row.value, locale.value)} / ${formatOverviewNumber(row.limit, locale.value)} ${unit}`.trim() : '',
      percent: row ? quotaPercent(row) : undefined,
      nextLimit: expandable(row) && validAmount.value ? `${formatOverviewNumber(row!.limit! + form.amount!, locale.value)} ${unit}`.trim() : '',
      error: submitted.value && !validAmount.value ? t('packages.ProjectHome.saasExpansionInvalidAmount') : '',
      canSubmit: expandable(row),
    }
  })
  /** 每次打开读取当前刷新结果，不沿用上一次额度或跨项目的表单。 */
  function open(rows: HomeRow[]) {
    if (isEdit()) return
    // 空数据、失败或全部不限额时，用独立示例完成演示，不把 mock 合入真实套餐卡片。
    isMock.value = !rows.some(expandable)
    quotas.value = (isMock.value ? MOCK_QUOTAS : rows).map(row => ({ ...row }))
    Object.assign(form, { quotaId: quotas.value.find(expandable)?.id || '', amount: 1, note: '' })
    submitted.value = false
    visible.value = true
  }
  function close() { visible.value = false }
  /** 切换扩容项清除数量校验，并从默认数量重新计算上限。 */
  function change(patch: Partial<QuotaExpansionForm>) {
    Object.assign(form, patch)
    if ('quotaId' in patch) { form.amount = 1; submitted.value = false }
  }
  /** 演示提交仅关闭弹窗并提示成功，重复提交或关闭后调用不产生反馈。 */
  function submit() {
    if (!visible.value || isEdit()) return
    submitted.value = true
    if (!validAmount.value || !expandable(selected.value)) return
    close()
    onlyMessage(t('packages.ProjectHome.saasExpansionSaved'), 'success')
  }
  return { visible, view, open, close, change, submit }
}
