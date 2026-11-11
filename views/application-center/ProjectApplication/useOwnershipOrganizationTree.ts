import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue'
import type { TreeProps } from 'ant-design-vue'
import type { AssetDimensionOption } from '@jetlinks-web-core/components/AssetOwnershipCondition'
import type { ConditionOptionPanelConfig } from '@jetlinks-web-core/components/ConditionFilter'

export interface OwnershipOrganizationTreeProps {
  value: string[]
  options?: AssetDimensionOption[]
  config?: ConditionOptionPanelConfig
  selectedOnly?: boolean
  reviewValues?: string[]
  focusValue?: string
}

interface OrganizationTreeNode {
  key: string
  title: string
  disabled?: boolean
  children?: OrganizationTreeNode[]
  option: AssetDimensionOption
  path: string
}

/** 树内搜索保留祖先，勾选始终独立；下级范围交给外层 closure 条件。 */
export const useOwnershipOrganizationTree = (
  props: OwnershipOrganizationTreeProps,
  update: (ids: string[]) => void,
  inlineResults: () => boolean = () => false
) => {
  const nodes = shallowRef<AssetDimensionOption[]>([])
  const keyword = ref('')
  const loading = ref(false)
  const failed = ref(false)
  const expanded = ref<string[]>([])
  const searchExpanded = ref<string[]>([])
  const search = ref('')
  const searchSelection = shallowRef(new Set<string>())
  let searchTimer: ReturnType<typeof setTimeout> | undefined
  let version = 0

  // 路径、检索文本和树节点只随目录更新建立一次，不随每次输入重新转换整棵树。
  const catalog = computed(() => {
    const paths = new Map<string, { label: string; ancestors: string[]; searchText: string }>()
    const flat: OrganizationTreeNode[] = []
    const convert = (items: AssetDimensionOption[], labels: string[], ancestors: string[]): OrganizationTreeNode[] =>
      items.map((item) => {
        const path = [...labels, item.label]
        paths.set(item.value, { label: path.join(' / '), ancestors, searchText: item.label.toLocaleLowerCase() })
        const node: OrganizationTreeNode = {
          key: item.value,
          title: item.label,
          disabled: item.disabled,
          option: item,
          path: labels.join(' / ')
        }
        flat.push(node)
        node.children = item.children?.length ? convert(item.children, path, [...ancestors, item.value]) : undefined
        return node
      })
    return { tree: convert(nodes.value, [], []), paths, flat, byId: new Map(flat.map((node) => [node.key, node])) }
  })
  const selected = computed(() =>
    props.value.map((value) => ({ value, label: catalog.value.paths.get(value)?.label || value }))
  )
  // 输入期间保留当前结果；清空立即恢复原展开状态，卸载时取消尚未执行的检索。
  watch(
    keyword,
    (value) => {
      clearTimeout(searchTimer)
      const next = value.trim().toLocaleLowerCase()
      if (!next) {
        search.value = ''
        return
      }
      if (next === search.value) return
      searchTimer = setTimeout(() => {
        // 每轮查询确定一次已选优先顺序；结果内勾选不重新排序，避免目标从鼠标下移走。
        searchSelection.value = new Set(props.value)
        search.value = next
        searchTimer = undefined
      }, 180)
    },
    { flush: 'sync' }
  )
  const filtered = computed(() => {
    const ancestors = new Set<string>()
    const filter = (items: OrganizationTreeNode[]): OrganizationTreeNode[] =>
      items.flatMap((item) => {
        const matches = catalog.value.paths.get(item.key)!.searchText.includes(search.value)
        const children = matches ? item.children || [] : filter(item.children || [])
        if (!matches && !children.length) return []
        if (children.length) ancestors.add(item.key)
        return [matches ? item : { ...item, children }]
      })
    return { nodes: search.value ? filter(catalog.value.tree) : catalog.value.tree, ancestors: [...ancestors] }
  })
  watch(
    filtered,
    (result) => {
      searchExpanded.value = result.ancestors
    },
    { flush: 'sync' }
  )
  const expandedKeys = computed(() => (search.value ? searchExpanded.value : expanded.value))
  const listMode = computed(() => inlineResults() && (!!props.selectedOnly || !!search.value))
  const searchResults = computed(() => {
    const matches = catalog.value.flat.filter((node) =>
      catalog.value.paths.get(node.key)!.searchText.includes(search.value)
    )
    return [
      ...matches.filter((node) => searchSelection.value.has(node.key)),
      ...matches.filter((node) => !searchSelection.value.has(node.key))
    ].map((node) => ({ ...node, children: undefined }))
  })
  const treeData = computed<OrganizationTreeNode[]>(() => {
    if (!inlineResults()) return filtered.value.nodes
    if (props.selectedOnly)
      return (props.reviewValues || props.value).map((id) => {
        const node = catalog.value.byId.get(id)
        return node
          ? { ...node, children: undefined }
          : { key: id, title: id, path: '', option: { value: id, label: id } }
      })
    return search.value ? searchResults.value : catalog.value.tree
  })
  const onExpand: NonNullable<TreeProps['onExpand']> = (keys) => {
    if (search.value) searchExpanded.value = keys.map(String)
    else expanded.value = keys.map(String)
  }
  const onCheck: NonNullable<TreeProps['onCheck']> = (_, info) => {
    const id = String(info.node.key)
    update(info.checked ? [...new Set([...props.value, id])] : props.value.filter((value) => value !== id))
  }
  const remove = (id: string) => update(props.value.filter((value) => value !== id))

  // 只由已打开的选择器调用注入的加载器；重试和卸载使旧响应失效。
  const load = async () => {
    const current = ++version
    loading.value = true
    failed.value = false
    try {
      const items: AssetDimensionOption[] = props.config?.loadOptions
        ? await props.config.loadOptions()
        : props.options || []
      if (current !== version) return
      const initial = !nodes.value.length
      nodes.value = items
      // 绑定核验会更新 disabled；保留用户展开状态，不因候选属性变化重置整棵树。
      expanded.value = initial
        ? [
            ...new Set([
              ...items.filter((item) => item.children?.length).map((item) => item.value),
              ...[...props.value, ...(props.focusValue ? [props.focusValue] : [])].flatMap(
                (id) => catalog.value.paths.get(id)?.ancestors || []
              )
            ])
          ]
        : expanded.value.filter((id) => catalog.value.byId.has(id))
    } catch {
      if (current === version) failed.value = true
    } finally {
      if (current === version) loading.value = false
    }
  }
  watch(() => [props.options, props.config?.loadOptions] as const, load, { immediate: true })
  onScopeDispose(() => {
    version++
    clearTimeout(searchTimer)
  })
  return {
    keyword,
    loading,
    failed,
    retry: load,
    selected,
    treeData,
    listMode,
    expandedKeys,
    onExpand,
    onCheck,
    remove
  }
}
