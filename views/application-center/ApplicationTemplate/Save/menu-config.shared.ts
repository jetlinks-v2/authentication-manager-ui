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

export const normalizeGrantableAssets = (response: any): GrantableAssetType[] =>
  unwrapList<Record<string, any>>(response)
    .map(item => ({
      assetType: String(item.assetType || item.id || ''),
      name: String(item.name || item.i18nName || item.assetType || item.id || ''),
      accesses: Array.isArray(item.accesses) ? item.accesses.map((access: any) => ({
        ...access,
        supportId: String(access.supportId || access.id || access.value || ''),
        name: String(access.name || access.i18nName || access.supportId || access.id || ''),
      })).filter((access: any) => !!access.supportId) : [],
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

export const normalizeCandidateMenus = (menus: MenuPermissionNode[] = []): MenuPermissionNode[] =>
  menus.map(source => ({
    ...source,
    granted: false,
    buttons: (source.buttons || source.actions || []).map(button => ({ ...button, granted: false })),
    actions: undefined,
    assetAccesses: (source.assetAccesses || []).map(access => ({ ...access, granted: false })),
    children: source.children?.length ? normalizeCandidateMenus(source.children) : null,
  }))

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
