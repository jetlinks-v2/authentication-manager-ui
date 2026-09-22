import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { ConditionFilterTerm } from '@jetlinks-web-core/components/ConditionFilter'
import {
  createDraft,
  filterConfigs,
  hasDuplicateIdentifier,
  type LoginConfig,
  type LoginConfigDraft,
  type LoginMethod,
  type MethodFilter,
} from './model'

export function useThirdPartyLogin() {
  const { t } = useI18n()
  const records = ref<LoginConfig[]>([])
  const selectedMethod = ref<MethodFilter>('all')
  const filterTerms = ref<ConditionFilterTerm[]>([])
  const drawerOpen = ref(false)
  const editing = ref<LoginConfig>()
  const creatingMethod = ref<LoginMethod>('wechat')
  const hasTemporaryChanges = ref(false)

  const visibleRecords = computed(() => filterConfigs(records.value, selectedMethod.value, filterTerms.value))
  const countFor = (method: MethodFilter) => method === 'all'
    ? records.value.length
    : records.value.filter(item => item.method === method).length

  function openCreate() {
    editing.value = undefined
    creatingMethod.value = selectedMethod.value === 'all' ? 'wechat' : selectedMethod.value
    drawerOpen.value = true
  }

  function openEdit(record: LoginConfig) {
    editing.value = record
    drawerOpen.value = true
  }

  // 只修改当前页面的内存记录，真实写入和登录联动留给下一阶段。
  function save(draft: LoginConfigDraft): boolean {
    if (hasDuplicateIdentifier(records.value, draft, editing.value?.id)) return false
    const record: LoginConfig = {
      ...createDraft(draft.method),
      ...draft,
      id: editing.value?.id ?? crypto.randomUUID(),
      updatedAt: new Date().toLocaleString(),
    }
    records.value = editing.value
      ? records.value.map(item => item.id === editing.value?.id ? record : item)
      : [record, ...records.value]
    hasTemporaryChanges.value = true
    drawerOpen.value = false
    editing.value = undefined
    return true
  }

  function remove(record: LoginConfig) {
    records.value = records.value.filter(item => item.id !== record.id)
    hasTemporaryChanges.value = true
  }

  function updateFlag(id: string, key: 'enabled' | 'showOnLogin', value: boolean) {
    records.value = records.value.map(item => item.id === id
      ? { ...item, [key]: value, updatedAt: new Date().toLocaleString() }
      : item)
    hasTemporaryChanges.value = true
  }

  function warnBeforeUnload(event: BeforeUnloadEvent) {
    if (!hasTemporaryChanges.value) return
    event.preventDefault()
    event.returnValue = ''
  }

  onMounted(() => window.addEventListener('beforeunload', warnBeforeUnload))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', warnBeforeUnload))
  onBeforeRouteLeave(() => !hasTemporaryChanges.value
    || window.confirm(`${t('ThirdPartyLogin.discardChanges')}\n${t('ThirdPartyLogin.discardConfirm')}`))

  return {
    records, selectedMethod, filterTerms, visibleRecords, drawerOpen, editing, creatingMethod,
    countFor, openCreate, openEdit, save, remove, updateFlag,
  }
}
