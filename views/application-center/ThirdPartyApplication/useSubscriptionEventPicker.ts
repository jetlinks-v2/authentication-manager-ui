import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ConditionFilterTerm } from '@jetlinks-web-core/components/ConditionFilter'
import type { SubscriptionEventProvider } from '@authentication-manager-ui/api/application-center/applicationSubscription'
import { useLocalTextFilter } from '../ApiGroup/useLocalTextFilter'
import { specTablePageSize, useSpecTablePagination } from '../ApiGroup/useSpecTablePagination'
import { unavailableEventIds } from './subscriptionEvents'

interface CategoryRow {
  key: string
  name: string
  eventIds: string[]
  unavailable?: boolean
}
interface EventPickerSource {
  providers: SubscriptionEventProvider[]
  modelValue: string[]
  disabled?: boolean
  loading?: boolean
}

const compactCategoryLimit = 6

export const useSubscriptionEventPicker = (source: EventPickerSource, select: (ids: string[]) => void) => {
  const { t } = useI18n()
  const terms = ref<ConditionFilterTerm[]>([])
  const selectedIds = computed(() => new Set(source.modelValue))
  const categories = computed<CategoryRow[]>(() => source.providers.filter(provider => provider.events.length).map(provider => ({
    key: JSON.stringify(['provider', provider.id]), name: provider.name,
    eventIds: [...new Set(provider.events.map(event => event.id))],
  })))
  const allRows = computed<CategoryRow[]>(() => {
    const unavailable = source.loading ? [] : unavailableEventIds(source.modelValue, source.providers)
    return [...categories.value, ...(unavailable.length ? [{
      key: JSON.stringify(['unavailable']), name: t('ThirdPartyApplication.subscription.unavailableEvents', { count: unavailable.length }),
      eventIds: unavailable, unavailable: true,
    }] : [])]
  })
  const showSearch = computed(() => allRows.value.length > compactCategoryLimit || terms.value.length > 0)
  const { filterFields, filtered, search: filter } = useLocalTextFilter(() => allRows.value, () => [
    { title: t('ThirdPartyApplication.subscription.eventCategories'), dataIndex: 'name' },
  ], row => row.name)
  const { page, slicePage, pagination } = useSpecTablePagination(() => filtered.value.length)
  const showPagination = computed(() => filtered.value.length > specTablePageSize)
  const pageRows = computed(() => slicePage(filtered.value).map(row => {
    const count = row.eventIds.reduce((sum, id) => sum + Number(selectedIds.value.has(id)), 0)
    return { ...row, checked: count === row.eventIds.length, indeterminate: count > 0 && count < row.eventIds.length }
  }))
  const tableScroll = computed(() => pageRows.value.length > compactCategoryLimit ? { y: 'min(36vh, 18rem)' } : undefined)
  const selectableRows = computed(() => pageRows.value.filter(row => !row.unavailable))
  const tableSelection = computed(() => {
    const visible = selectableRows.value
    const checked = visible.length > 0 && visible.every(row => row.checked)
    return { checked, indeterminate: !checked && visible.some(row => row.checked || row.indeterminate), disabled: !visible.length }
  })
  const selectedCategoryCount = computed(() => categories.value.filter(category => category.eventIds.some(id => selectedIds.value.has(id))).length)
  const toggleIds = (ids: string[], checked: boolean) => {
    if (source.disabled || source.loading) return
    const next = new Set(source.modelValue)
    for (const id of ids) {
      if (checked) next.add(id)
      else next.delete(id)
    }
    select([...next])
  }
  const toggleCategory = (row: CategoryRow, checked: boolean) => toggleIds(row.eventIds, checked)
  // 全选仅影响当前页的可用类别；隐藏、跨页和目录不可用的原订阅不会被顺带清除。
  const togglePage = (checked: boolean) => toggleIds(selectableRows.value.flatMap(row => row.eventIds), checked)
  const search = (value: ConditionFilterTerm[]) => { terms.value = value; filter(value); page.value = 1 }
  return { terms, filterFields, showSearch, pageRows, tableScroll, pagination, showPagination, tableSelection, selectedCategoryCount,
    search, toggleCategory, togglePage }
}
