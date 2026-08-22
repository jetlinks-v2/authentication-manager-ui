import type {
  AssetAccessPolicy,
  AssetTypeName,
  GrantableAssetType,
  MenuPermissionNode,
} from '@jetlinks-web-core/hooks'
import type {
  BusinessApplicationTemplate,
  SelectOption,
  TemplateAssetAccessPolicy,
} from '@authentication-manager-ui/api/application-center/applicationTemplate'

export type { SelectOption }

export const DEFAULT_SCOPE_STRATEGY = 'IGNORE'

export const unwrapResult = <T>(response: any, fallback: T): T =>
  (response?.result ?? response ?? fallback) as T

export const unwrapList = <T>(response: any): T[] => {
  const result = response?.result ?? response
  if (Array.isArray(result)) return result as T[]
  return Array.isArray(result?.data) ? result.data as T[] : []
}

export const enumValue = (value?: string | { value?: string; text?: string }) =>
  typeof value === 'object' ? String(value.value || '') : String(value || '')

export const templateState = (detail: Partial<BusinessApplicationTemplate>) =>
  enumValue(detail.state) || 'enabled'

export const normalizeAssetTypeNames = (response: any): AssetTypeName[] =>
  unwrapList<Record<string, unknown>>(response)
    .map(item => ({
      id: String(item.id || ''),
      name: String(item.i18nName || item.name || item.id || ''),
    }))
    .filter(item => !!item.id)

const supportIdOf = (access: unknown) => {
  if (access == null) return ''
  if (typeof access !== 'object') return String(access)
  const item = access as Record<string, unknown>
  return String(
    item.supportId
    || item.id
    || item.value
    || item.type
    || item.permission
    || item.permissionId
    || '',
  )
}

const supportNameOf = (access: unknown) => {
  if (!access || typeof access !== 'object') return supportIdOf(access)
  const item = access as Record<string, unknown>
  return String(item.i18nName || item.name || item.text || item.label || supportIdOf(access))
}

const accessListOf = (item: Record<string, any>) => {
  const fields = [
    item.accesses,
    item.permissions,
    item.permissionList,
    item.supports,
    item.options,
    item.children,
    item.data,
  ]
  const list = fields.find(Array.isArray)
  if (list) return list
  return supportIdOf(item) ? [item] : []
}

const grantableAssetListOf = (response: any): Record<string, any>[] => {
  const result = response?.result ?? response
  if (Array.isArray(result)) return result
  if (Array.isArray(result?.data)) return result.data
  if (Array.isArray(result?.items)) return result.items
  if (result?.assetType) return [result]
  if (!result || typeof result !== 'object') return []
  return Object.entries(result)
    .filter(([key]) => !['success', 'message', 'code'].includes(key))
    .map(([assetType, value]) => {
      if (Array.isArray(value)) return { assetType, accesses: value }
      if (value && typeof value === 'object') {
        const item = value as Record<string, any>
        return {
          ...item,
          assetType: item.assetType || assetType,
        }
      }
      return { assetType, accesses: value ? [value] : [] }
    })
}

export const normalizeGrantableAssets = (response: any): GrantableAssetType[] =>
  grantableAssetListOf(response)
    .map(item => ({
      assetType: String(item.assetType || item.id || item.value || item.type || ''),
      name: String(item.name || item.i18nName || item.text || item.label || item.assetType || item.id || ''),
      accesses: accessListOf(item)
        .map((access: any) => ({
          ...(access && typeof access === 'object' ? access : {}),
          supportId: supportIdOf(access),
          name: supportNameOf(access),
          disabled: access?.disabled === true,
        }))
        .filter((access, index, all) =>
          !!access.supportId && all.findIndex(current => current.supportId === access.supportId) === index),
    }))
    .filter(item => !!item.assetType)

export const normalizeScopeStrategyOptions = (response: any): SelectOption[] =>
  unwrapList<Record<string, unknown>>(response)
    .map(item => ({
      value: String(item.value || item.id || ''),
      label: String(item.text || item.name || item.label || item.value || item.id || ''),
      disabled: item.disabled === true,
    }))
    .filter((item, index, all) =>
      !!item.value && all.findIndex(current => current.value === item.value) === index)

export const flattenMenuIds = (menus: MenuPermissionNode[] = []) => {
  const ids: string[] = []
  const visit = (items: MenuPermissionNode[]) => items.forEach(item => {
    if (item.id) ids.push(String(item.id))
    visit(Array.isArray(item.children) ? item.children : [])
  })
  visit(menus)
  return ids
}

export const findMissingMenuIds = (
  grantedMenus: MenuPermissionNode[] = [],
  sourceMenus: MenuPermissionNode[] = [],
) => {
  const sourceIds = new Set(flattenMenuIds(sourceMenus))
  return flattenMenuIds(grantedMenus).filter(id => !sourceIds.has(id))
}

const grantedFlagOf = (item: unknown, fallback = false) => {
  if (!item || typeof item !== 'object') return fallback
  const value = (item as Record<string, unknown>).granted
    ?? (item as Record<string, unknown>).enabled
    ?? (item as Record<string, unknown>).checked
    ?? (item as Record<string, unknown>).selected
  return value === undefined ? fallback : value !== false && value !== 'false' && value !== 0
}

const fieldArrayOf = (item: Record<string, any>, fields: string[]) =>
  fields.map(field => item[field]).find(Array.isArray) || []

const buttonListOf = (item: Record<string, any>) =>
  fieldArrayOf(item, ['buttons', 'actions'])

const assetAccessListOf = (item: Record<string, any>) => {
  const direct = fieldArrayOf(item, ['assetAccesses', 'dataAccesses', 'selectAccesses'])
  const byType = item.selectAccessesByAssetType
  if (!byType || typeof byType !== 'object' || Array.isArray(byType)) return direct
  const grouped = Object.entries(byType).flatMap(([assetType, accesses]) =>
    Array.isArray(accesses)
      ? accesses.map(access => ({
        ...(access && typeof access === 'object' ? access : { supportId: access }),
        assetType,
      }))
      : [])
  return [...direct, ...grouped]
}

const valueOf = (value: unknown) => {
  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>
    return String(item.id || item.value || item.assetType || '')
  }
  return String(value || '')
}

const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)))

const APPLICATION_INTERFACE_PERMISSION_CODES = new Set(['open-api'])

const permissionCodeOf = (value: unknown) => {
  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>
    return String(item.permission || item.id || item.value || item.code || '')
  }
  return String(value || '')
}

const hasApplicationInterfacePermission = (value: unknown) => {
  const values = Array.isArray(value) ? value : [value]
  return values.some(item => APPLICATION_INTERFACE_PERMISSION_CODES.has(permissionCodeOf(item)))
}

const withoutApplicationInterfacePermissions = <T extends Record<string, any>>(item: T): T => {
  const result = { ...item }
  if (Array.isArray(result.permissions)) {
    result.permissions = result.permissions.filter(permission => !hasApplicationInterfacePermission(permission))
  }
  return result
}

const isApplicationInterfaceMenu = (menu: MenuPermissionNode) =>
  hasApplicationInterfacePermission(menu.code)
  || hasApplicationInterfacePermission(menu.permission)
  || hasApplicationInterfacePermission(menu.showPage)

const filterMenuButtons = (menu: MenuPermissionNode, field: 'buttons' | 'actions') => {
  const buttons = menu[field]
  if (!Array.isArray(buttons)) return buttons
  return buttons
    .map(button => withoutApplicationInterfacePermissions(button))
    .filter((button, index) => {
      if (hasApplicationInterfacePermission(button.id) || hasApplicationInterfacePermission(button.permission)) return false
      const sourceButton = buttons[index]
      return !(Array.isArray(sourceButton.permissions)
        && sourceButton.permissions.length
        && Array.isArray(button.permissions)
        && !button.permissions.length)
    })
}

export const filterApplicationMenuInterfacePermissions = (
  menus: MenuPermissionNode[] = [],
): MenuPermissionNode[] => {
  const visit = (items: MenuPermissionNode[]): MenuPermissionNode[] => items
    .map(item => {
      // 应用菜单暂不开放接口权限；历史模板和角色授权回显也在进入编辑器前统一裁剪。
      if (isApplicationInterfaceMenu(item)) return undefined
      const menu = withoutApplicationInterfacePermissions(item)
      menu.buttons = filterMenuButtons(menu, 'buttons')
      menu.actions = filterMenuButtons(menu, 'actions')
      menu.children = item.children?.length ? visit(item.children) : null
      return menu
    })
    .filter((item): item is MenuPermissionNode => !!item)
  return visit(menus)
}

const menuAssetTypesOf = (menu: MenuPermissionNode): string[] => {
  if (Array.isArray(menu.assetTypes)) return unique(menu.assetTypes.map(valueOf))
  if (menu.assetTypes) return unique([valueOf(menu.assetTypes)])

  const assetType = valueOf(menu.assetType)
  if (assetType) return [assetType]

  return unique(assetAccessListOf(menu).map((access: any) => valueOf(access?.assetType)))
}

const normalizeMenuAssetAccesses = (
  item: Record<string, any>,
  fallbackGranted = false,
) => assetAccessListOf(item)
  .map((access: any) => ({
    ...(access && typeof access === 'object' ? access : {}),
    supportId: supportIdOf(access),
    granted: grantedFlagOf(access, fallbackGranted),
  }))
  .filter(access => !!access.supportId || !!access.assetType)

export const normalizeCandidateMenus = (menus: MenuPermissionNode[] = []): MenuPermissionNode[] =>
  menus.map(source => ({
    ...source,
    granted: false,
    buttons: buttonListOf(source).map(button => ({ ...button, granted: false })),
    actions: undefined,
    assetAccesses: normalizeMenuAssetAccesses(source),
    children: source.children?.length ? normalizeCandidateMenus(source.children) : null,
  }))

const flattenMenus = (menus: MenuPermissionNode[] = []) => {
  const result: MenuPermissionNode[] = []
  const visit = (items: MenuPermissionNode[]) => items.forEach(item => {
    result.push(item)
    visit(Array.isArray(item.children) ? item.children : [])
  })
  visit(menus)
  return result
}

const assetScopeFields = [
  'assetType',
  'assetTypes',
  'assetAccesses',
  'dataAccesses',
  'selectAccesses',
  'selectAccessesByAssetType',
] as const

const withProjectMenuAssetScope = (
  templateMenu: MenuPermissionNode,
  projectMenu: MenuPermissionNode,
): MenuPermissionNode => {
  const result = { ...templateMenu }
  assetScopeFields.forEach(field => {
    if (Object.prototype.hasOwnProperty.call(projectMenu, field)) {
      result[field] = projectMenu[field]
    } else {
      delete result[field]
    }
  })
  return result
}

const buildAllowedAssetAccessMap = (menus: MenuPermissionNode[] = []) => {
  const allowed = new Map<string, Set<string>>()
  const add = (assetType: string, supportId: string) => {
    if (!assetType || !supportId) return
    if (!allowed.has(assetType)) allowed.set(assetType, new Set())
    allowed.get(assetType)!.add(supportId)
  }
  flattenMenus(menus).forEach(menu => {
    const menuAssetTypes = menuAssetTypesOf(menu)
    normalizeMenuAssetAccesses(menu).forEach(access => {
      const supportId = supportIdOf(access)
      const assetTypes = valueOf(access.assetType) ? [valueOf(access.assetType)] : menuAssetTypes
      assetTypes.forEach(assetType => add(assetType, supportId))
    })
  })
  return allowed
}

export const filterAssetAccessPoliciesByMenuScope = (
  policies: AssetAccessPolicy[] = [],
  sourceMenus: MenuPermissionNode[] = [],
): AssetAccessPolicy[] => {
  const allowed = buildAllowedAssetAccessMap(sourceMenus)
  return policies
    .map(policy => {
      const assetType = String(policy.assetType || '')
      const supports = allowed.get(assetType)
      if (!assetType || !supports?.size) return undefined
      const accesses = (policy.accesses || []).filter(access => supports.has(supportIdOf(access)))
      return accesses.length ? { ...policy, assetType, accesses } : undefined
    })
    .filter((policy): policy is AssetAccessPolicy => !!policy)
}

export const filterGrantedMenuAssetAccessesByMenuScope = (
  menus: MenuPermissionNode[] = [],
  sourceMenus: MenuPermissionNode[] = [],
): MenuPermissionNode[] => {
  const allowed = buildAllowedAssetAccessMap(sourceMenus)
  const visit = (items: MenuPermissionNode[]): MenuPermissionNode[] => items.map(item => {
    const menuAssetTypes = menuAssetTypesOf(item)
    const assetAccesses = normalizeMenuAssetAccesses(item, true)
      .map(access => {
        const supportId = supportIdOf(access)
        const accessAssetType = valueOf(access.assetType)
        const assetType = (accessAssetType ? [accessAssetType] : menuAssetTypes)
          .find(type => allowed.get(type)?.has(supportId))
        return assetType ? { ...access, assetType } : undefined
      })
      .filter((access): access is Record<string, any> => !!access)

    return {
      ...item,
      assetAccesses,
      children: item.children?.length ? visit(item.children) : null,
    }
  })
  return visit(menus)
}

const flattenMenusForRuntimeFilter = (menus: MenuPermissionNode[] = []) => {
  const result: MenuPermissionNode[] = []
  const visit = (items: MenuPermissionNode[], parentId?: string) => items.forEach(item => {
    result.push({
      ...item,
      parentId: item.parentId || parentId,
      children: null,
    })
    visit(Array.isArray(item.children) ? item.children : [], item.id)
  })
  visit(menus)
  return result
}

const buildMenuTreeByParentId = (menus: MenuPermissionNode[] = []) => {
  const menuMap = new Map<string, MenuPermissionNode>()
  const roots: MenuPermissionNode[] = []
  menus.forEach(menu => {
    if (menu.id) menuMap.set(String(menu.id), { ...menu, children: null })
  })
  menuMap.forEach(menu => {
    const parent = menu.parentId ? menuMap.get(String(menu.parentId)) : undefined
    if (parent) parent.children = [...(parent.children || []), menu]
    else roots.push(menu)
  })
  return roots
}

export const filterApplicationMenuTreeByRuntimeIds = (
  templateMenus: MenuPermissionNode[] = [],
  runtimeMenus: MenuPermissionNode[] = [],
) => {
  const runtimeMenuMap = new Map<string, MenuPermissionNode>()
  flattenMenusForRuntimeFilter(runtimeMenus).forEach(menu => {
    const id = String(menu.id || '').trim()
    // 临时忽略 owner，待运行时菜单归属与模板数据统一后再恢复应用端范围过滤。
    if (id) runtimeMenuMap.set(id, menu)
  })
  const filteredMenus = flattenMenusForRuntimeFilter(templateMenus)
    .map(menu => {
      const runtimeMenu = runtimeMenuMap.get(String(menu.id || '').trim())
      if (!runtimeMenu) return undefined
      // 菜单集合来自模板，资产范围必须降到当前项目菜单，避免应用角色授出模板侧高权限范围。
      return withProjectMenuAssetScope(menu, runtimeMenu)
    })
    .filter((menu): menu is MenuPermissionNode => !!menu)
  return buildMenuTreeByParentId(filteredMenus)
}

export const normalizeGrantedMenus = (
  menus: MenuPermissionNode[] = [],
  sourceMenus: MenuPermissionNode[] = [],
): MenuPermissionNode[] => {
  const sourceMap = new Map(flattenMenus(sourceMenus).map(menu => [String(menu.id || ''), menu]))
  const visit = (items: MenuPermissionNode[]): MenuPermissionNode[] => items.map(item => {
    const source = sourceMap.get(String(item.id || ''))
    const granted = grantedFlagOf(item, true)
    const buttons = buttonListOf(item)
    const normalized = {
      ...item,
      granted,
      buttons: buttons.length
        ? buttons.map(button => ({ ...button, granted: grantedFlagOf(button, true) }))
        : (granted && source?.buttons?.length
          ? source.buttons.map(button => ({ ...button, granted: true }))
          : []),
      actions: undefined,
      assetAccesses: normalizeMenuAssetAccesses(item, true),
      children: item.children?.length ? visit(item.children) : null,
    }
    return normalized
  })
  return visit(menus)
}

export const buildFullMenuGrantTree = (menus: MenuPermissionNode[] = []): MenuPermissionNode[] =>
  menus.map(source => {
    const menu = { ...source }
    menu.granted = !!source.granted
    menu.buttons = (source.buttons || []).map(button => ({ ...button, granted: !!button.granted }))
    menu.children = source.children?.length ? buildFullMenuGrantTree(source.children) : null
    delete menu._granted
    delete menu.indeterminate
    delete menu.actions
    delete menu.assetAccesses
    delete menu.dataAccesses
    delete menu.selectAccesses
    delete menu.selectAccessesByAssetType
    return menu
  })

export const buildTemplateAssetAccesses = (
  policies: AssetAccessPolicy[],
  strategies: Record<string, string>,
): TemplateAssetAccessPolicy[] => policies.map(policy => ({
  ...policy,
  options: {
    // scopeStrategy 是模板级资产范围策略，独立于 accesses.supportId 的权限选择。
    scopeStrategy: strategies[policy.assetType] || DEFAULT_SCOPE_STRATEGY,
  },
}))

export const buildStrategyDraft = (policies: TemplateAssetAccessPolicy[] = []) =>
  Object.fromEntries(policies.map(policy => [
    String(policy.assetType),
    enumValue(policy.options?.scopeStrategy) || DEFAULT_SCOPE_STRATEGY,
  ]))
