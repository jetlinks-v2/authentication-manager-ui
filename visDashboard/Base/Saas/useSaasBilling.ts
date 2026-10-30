import { computed, reactive, ref, watch, type Ref } from 'vue'
import dayjs from 'dayjs'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import type { SaasProjectSummary } from './components/presentation'

export type SaasBillingKind = 'renew' | 'upgrade'
export interface SaasBillingForm { years: number; note: string }
export interface SaasBillingView {
  kind: SaasBillingKind
  form: SaasBillingForm
  project: string
  expiresAt?: string
  nextExpiresAt?: string
  quotas: { id: string; label: string; value: string }[]
}

/** 原型企业版额度仅用于演示，不作为当前套餐、报价或实际升级结果。 */
const ENTERPRISE_PREVIEW = [
  { id: 'device', label: 'saasDevices', amount: 2000, unit: 'saasUnitDevices' },
  { id: 'video', label: 'saasVideo', amount: 500, unit: 'saasUnitChannels' },
  { id: 'gateway', label: 'saasGateway', amount: 50, unit: 'saasUnitDevices' },
  { id: 'screen', label: 'saasScreen', amount: null, unit: '' },
  { id: 'storage', label: 'saasBillingStorage', amount: 20, unit: 'saasBillingTB' },
  { id: 'member', label: 'saasBillingMembers', amount: 100, unit: 'saasBillingPeople' },
] as const

/** 续费/升级只在本地演示表单，保存反馈成功但不请求接口或更改项目套餐。 */
export function useSaasBilling(summary: Readonly<Ref<SaasProjectSummary>>) {
  const { t, locale } = useI18n()
  const visible = ref(false)
  const kind = ref<SaasBillingKind>('renew')
  const form = reactive<SaasBillingForm>({ years: 1, note: '' })
  const view = computed<SaasBillingView>(() => {
    const expires = summary.value.expiresAt
    const validExpires = expires && dayjs(expires).isValid() ? expires : undefined
    return {
      kind: kind.value, form,
      project: [summary.value.name, summary.value.id].filter(Boolean).join(' · '),
      expiresAt: validExpires,
      nextExpiresAt: validExpires ? dayjs(validExpires).add(form.years, 'year').format('YYYY-MM-DD') : undefined,
      quotas: ENTERPRISE_PREVIEW.map(item => ({ id: item.id, label: t(`packages.ProjectHome.${item.label}`),
        value: item.amount === null ? t('packages.ProjectHome.saasBillingUnlimited')
          : `${item.amount.toLocaleString(locale.value)} ${t(`packages.ProjectHome.${item.unit}`)}` })),
    }
  })
  function close() { visible.value = false }
  /** 每次打开重置输入，取消、保存后再次打开不残留上一份草稿。 */
  function open(next: SaasBillingKind) {
    kind.value = next
    Object.assign(form, { years: 1, note: '' })
    visible.value = true
  }
  function change(patch: Partial<SaasBillingForm>) {
    if (patch.years !== undefined && [1, 2, 3].includes(patch.years)) form.years = patch.years
    if (typeof patch.note === 'string') form.note = patch.note.slice(0, 500)
  }
  function save() {
    if (!visible.value) return
    close()
    onlyMessage(t('packages.ProjectHome.saasBillingSaved'), 'success')
  }
  // 切换项目时关闭旧项目表单，不跨项目保留草稿。
  watch(() => summary.value.id, close)
  return { visible, view, open, close, change, save }
}
