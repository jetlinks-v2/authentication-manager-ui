import { computed, ref } from 'vue'
import type { ConditionFilterField, ConditionFilterTerm } from '@jetlinks-web-core/components/ConditionFilter'

type TextField = Pick<ConditionFilterField, 'title' | 'dataIndex'>

// 本地列表只提供“包含”，消费 modelValue 原始条件，避免把 change 事件中后端 like 的通配符当作搜索文本。
export const useLocalTextFilter = <T>(source: () => T[], fields: () => TextField[], valueOf: (row: T, column: string) => unknown) => {
  const terms = ref<ConditionFilterTerm[]>([])
  const filterFields = computed<ConditionFilterField[]>(() => fields().map(field => ({
    ...field, search: { type: 'string', defaultTermType: 'like', termTypeOptions: ['like'] },
  })))
  const matches = (row: T, items: ConditionFilterTerm[]): boolean => {
    if (!items.length) return true
    let result = false
    let conjunction = true
    items.forEach((term, index) => {
      const values = valueOf(row, term.column || '')
      const match = term.terms ? matches(row, term.terms)
        : [values].flat().some(value => String(value ?? '').toLowerCase().includes(String(term.value ?? '').toLowerCase()))
      if (index && term.type === 'or') {
        result = result || conjunction
        conjunction = match
      } else conjunction = conjunction && match
    })
    return result || conjunction
  }
  const filtered = computed(() => source().filter(row => matches(row, terms.value)))
  const search = (value: ConditionFilterTerm[]) => { terms.value = value }
  const reset = () => { terms.value = [] }
  return { filterFields, filtered, search, reset }
}

export const specTextFields = (t: (key: string) => string): TextField[] => [
  { title: t('ApiGroupManagement.spec.summary'), dataIndex: 'summary' },
  { title: t('ApiGroupManagement.spec.path'), dataIndex: 'path' },
  { title: t('ApiGroupManagement.spec.method'), dataIndex: 'method' },
  { title: t('ApiGroupManagement.spec.appId'), dataIndex: 'appId' },
  { title: t('ApiGroupManagement.spec.id'), dataIndex: 'id' },
]
