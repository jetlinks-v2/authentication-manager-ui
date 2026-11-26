import { computed, onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue'
import { getMenuTree } from '@authentication-manager-ui/api/system/menu'
import type { ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import { useLocalPagination } from '@jetlinks-web-core/components/CorePagination/useLocalPagination'

type MenuNode = { id: string; code: string; sortIndex: number; children?: MenuNode[] }

export function useMenuRootPage(filter: Ref<ConditionFilterChangePayload['filter']>) {
  const roots = shallowRef<MenuNode[]>([])
  const loading = ref(false), failed = ref(false)
  const page = useLocalPagination(roots)
  // 新增项的排序取完整树，不受当前展示页影响；9999 是个人中心保留位。
  const nextSortIndex = computed(() => {
    const last = roots.value.filter(row => row.code !== 'account-center').at(-1)
    const next = last ? last.sortIndex + 1 : 1
    return next === 9999 ? 10000 : next
  })
  let revision = 0
  async function reload() {
    const id = ++revision
    failed.value = false
    loading.value = true
    try {
      const response = await getMenuTree({ ...filter.value, type: 'and', paging: false,
        terms: [{ column: 'options', termType: 'nlike', value: '%show":false%' }, ...filter.value.terms],
        sorts: [{ name: 'sortIndex', order: 'asc' }],
      })
      if (revision !== id) return
      if (response.status !== 200 || !Array.isArray(response.result)) throw new Error('Invalid menu tree')
      roots.value = response.result
    } catch {
      if (revision === id) { roots.value = []; failed.value = true }
    } finally {
      if (revision === id) loading.value = false
    }
  }
  watch(filter, () => { page.reset(); void reload() }, { immediate: true, deep: true })
  onScopeDispose(() => { revision++ })
  return { ...page, nextSortIndex, loading, failed, reload }
}
