import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AxiosResponseRewrite } from '@jetlinks-web/types'
import type { ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import type { TablePaginationConfig } from 'ant-design-vue'
import type { PagerResult, QueryPayload } from '@authentication-manager-ui/api/application-center/businessApplication'
import { resultOf } from '../applicationModel'

interface CallbackPageOptions<T> {
  id: () => string
  active: () => boolean
  query: (id: string, query: QueryPayload) => Promise<AxiosResponseRewrite<PagerResult<T>>>
  sort: string
}

/** 快照和投递列表共用分页、筛选与实例请求隔离，不自动轮询或重试。 */
export const useApplicationCallbackPage = <T>(options: CallbackPageOptions<T>) => {
  const { t } = useI18n()
  const rows = shallowRef<T[]>([])
  const total = ref(0)
  const pageIndex = ref(0)
  const pageSize = ref(20)
  const loading = ref(false)
  const error = ref('')
  const filters = ref<ConditionFilterChangePayload['filter']>({ terms: [] })
  let sequence = 0
  const pagination = computed(() => ({ current: pageIndex.value + 1, pageSize: pageSize.value, total: total.value,
    showSizeChanger: true, pageSizeOptions: ['20', '50', '100'] }))
  const load = async (force = false) => {
    if (!options.id() || (!force && !options.active())) return
    const id = options.id()
    const version = ++sequence
    loading.value = true
    error.value = ''
    try {
      const value = resultOf<PagerResult<T>>(await options.query(id, {
        pageIndex: pageIndex.value, pageSize: pageSize.value,
        terms: filters.value.terms.map(term => ({ ...term })),
        sorts: [{ name: options.sort, order: 'desc' }],
      }))
      if (sequence !== version || id !== options.id()) return
      rows.value = value.data
      total.value = value.total ?? 0
      pageIndex.value = value.pageIndex ?? pageIndex.value
      pageSize.value = value.pageSize ?? pageSize.value
    } catch {
      if (sequence === version && id === options.id()) error.value = t('ApplicationConnection.queryFailed')
    } finally {
      if (sequence === version && id === options.id()) loading.value = false
    }
  }
  watch(() => [options.id(), options.active()] as const, ([, active]) => {
    ++sequence
    rows.value = []
    total.value = 0
    pageIndex.value = 0
    pageSize.value = 20
    filters.value = { terms: [] }
    loading.value = false
    error.value = ''
    if (active) void load()
  }, { immediate: true })
  onBeforeUnmount(() => { ++sequence })
  const search = (payload: ConditionFilterChangePayload) => {
    if (JSON.stringify(filters.value.terms) === JSON.stringify(payload.filter.terms)) return
    filters.value = payload.filter
    pageIndex.value = 0
    void load()
  }
  const changePage = (pagination: TablePaginationConfig) => {
    pageIndex.value = (pagination.current ?? 1) - 1
    pageSize.value = pagination.pageSize ?? 20
    void load()
  }
  return { rows, pagination, loading, error, load, search, changePage }
}
