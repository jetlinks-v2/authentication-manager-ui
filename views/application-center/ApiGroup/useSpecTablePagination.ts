import { computed, ref, watch } from 'vue'

export const specTablePageSize = 12

export const useSpecTablePagination = (total: () => number) => {
  const page = ref(1)
  const pageSize = ref(specTablePageSize)
  const slicePage = <T,>(rows: T[]) => {
    const start = (page.value - 1) * pageSize.value
    return rows.slice(start, start + pageSize.value)
  }
  const changePage = (current: number, size: number) => {
    page.value = size === pageSize.value ? current : 1
    pageSize.value = size
  }
  const pagination = computed(() => ({
    pageIndex: page.value - 1, pageSize: pageSize.value, total: total(),
    showSizeChanger: true, pageSizeOptions: ['12', '24', '48', '96'], onChange: changePage,
  }))
  watch(total, count => { page.value = Math.min(page.value, Math.max(1, Math.ceil(count / pageSize.value))) })
  return { page, pageSize, slicePage, pagination }
}
