import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue'
import type { TreeProps } from 'ant-design-vue'
import type { AssetDimensionOption } from '@jetlinks-web-core/components/AssetOwnershipCondition'
import type { ConditionOptionPanelConfig } from '@jetlinks-web-core/components/ConditionFilter'

export interface OwnershipOrganizationTreeProps {
  value: string[]
  options?: AssetDimensionOption[]
  config?: ConditionOptionPanelConfig
}

interface OrganizationTreeNode {
  key: string
  title: string
  disabled?: boolean
  children?: OrganizationTreeNode[]
}

/** 树内搜索保留祖先，勾选始终独立；下级范围交给外层 closure 条件。 */
export const useOwnershipOrganizationTree = (
  props: OwnershipOrganizationTreeProps, update: (ids: string[]) => void,
) => {
  const nodes = shallowRef<AssetDimensionOption[]>([])
  const keyword = ref('')
  const loading = ref(false)
  const failed = ref(false)
  const expanded = ref<string[]>([])
  const searchExpanded = ref<string[]>([])
  const search = ref('')
  let searchTimer: ReturnType<typeof setTimeout> | undefined
  let version = 0

  // 路径、检索文本和树节点只随目录更新建立一次，不随每次输入重新转换整棵树。
  const catalog = computed(() => {
    const paths = new Map<string, { label: string; ancestors: string[]; searchText: string }>()
    const convert = (items: AssetDimensionOption[], labels: string[], ancestors: string[]): OrganizationTreeNode[] => items.map(item => {
      const path = [...labels, item.label]
      paths.set(item.value, { label: path.join(' / '), ancestors, searchText: item.label.toLocaleLowerCase() })
      return {
        key: item.value, title: item.label, disabled: item.disabled,
        children: item.children?.length ? convert(item.children, path, [...ancestors, item.value]) : undefined,
      }
    })
    return { tree: convert(nodes.value, [], []), paths }
  })
  const selected = computed(() => props.value.map(value => ({ value, label: catalog.value.paths.get(value)?.label || value })))
  // 输入期间保留当前结果；清空立即恢复原展开状态，卸载时取消尚未执行的检索。
  watch(keyword, value => {
    clearTimeout(searchTimer)
    const next = value.trim().toLocaleLowerCase()
    if (!next) { search.value = ''; return }
    searchTimer = setTimeout(() => { search.value = next; searchTimer = undefined }, 180)
  }, { flush: 'sync' })
  const filtered = computed(() => {
    const ancestors = new Set<string>()
    const filter = (items: OrganizationTreeNode[]): OrganizationTreeNode[] => items.flatMap(item => {
      const matches = catalog.value.paths.get(item.key)!.searchText.includes(search.value)
      const children = matches ? item.children || [] : filter(item.children || [])
      if (!matches && !children.length) return []
      if (children.length) ancestors.add(item.key)
      return [matches ? item : { ...item, children }]
    })
    return { nodes: search.value ? filter(catalog.value.tree) : catalog.value.tree, ancestors: [...ancestors] }
  })
  watch(filtered, result => { searchExpanded.value = result.ancestors }, { flush: 'sync' })
  const expandedKeys = computed(() => search.value ? searchExpanded.value : expanded.value)
  const treeData = computed(() => filtered.value.nodes)
  const onExpand: NonNullable<TreeProps['onExpand']> = keys => {
    if (search.value) searchExpanded.value = keys.map(String)
    else expanded.value = keys.map(String)
  }
  const onCheck: NonNullable<TreeProps['onCheck']> = (_, info) => {
    const id = String(info.node.key)
    update(info.checked ? [...new Set([...props.value, id])] : props.value.filter(value => value !== id))
  }
  const remove = (id: string) => update(props.value.filter(value => value !== id))

  // 只由已打开的选择器调用注入的加载器；重试和卸载使旧响应失效。
  watch(() => [props.options, props.config?.loadOptions] as const, async () => {
    const current = ++version
    loading.value = true
    failed.value = false
    try {
      const items: AssetDimensionOption[] = props.config?.loadOptions
        ? await props.config.loadOptions() : props.options || []
      if (current !== version) return
      nodes.value = items
      expanded.value = [...new Set([
        ...items.filter(item => item.children?.length).map(item => item.value),
        ...props.value.flatMap(id => catalog.value.paths.get(id)?.ancestors || []),
      ])]
    } catch {
      if (current === version) failed.value = true
    } finally {
      if (current === version) loading.value = false
    }
  }, { immediate: true })
  onScopeDispose(() => { version++; clearTimeout(searchTimer) })
  return { keyword, loading, failed, selected, treeData, expandedKeys, onExpand, onCheck, remove }
}
