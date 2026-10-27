import { cloneDeep } from 'lodash-es'
import type { SubscriptionConfiguration, SubscriptionScope } from '@authentication-manager-ui/api/application-center/applicationSubscription'

// 配置来自 JSON 接口，深复制保证编辑嵌套配置不会改动列表记录或详情快照。
export const copyConfiguration = (value: Record<string, unknown> = {}): Record<string, unknown> => cloneDeep(value)
export const copyScopes = (scopes: SubscriptionScope[] = []): SubscriptionScope[] => scopes.map(scope => ({
  eventTypes: [...scope.eventTypes], configuration: copyConfiguration(scope.configuration),
}))
// 选择表只编辑事件集合：保留原事件所属的每一份配置，取消后重新勾选也恢复原映射。
export const scopesForEvents = (source: SubscriptionScope[], eventIds: string[]): SubscriptionScope[] => {
  const selected = new Set(eventIds)
  const originalIds = new Set(source.flatMap(scope => scope.eventTypes))
  const scopes = copyScopes(source).flatMap(scope => {
    const eventTypes = scope.eventTypes.filter(id => selected.has(id))
    // 仅移除用户明确取消了全部事件的分组，不合并仍然有效的原配置。
    return scope.eventTypes.length && !eventTypes.length ? [] : [{ ...scope, eventTypes }]
  })
  const added = [...selected].filter(id => !originalIds.has(id))
  if (added.length) {
    const unconfigured = scopes.find(scope => !Object.keys(scope.configuration).length)
    if (unconfigured) unconfigured.eventTypes.push(...added)
    else scopes.push({ eventTypes: added, configuration: {} })
  }
  return scopes
}
export const subscriptionPayload = (value: SubscriptionConfiguration): SubscriptionConfiguration => ({
  name: value.name.trim(), description: value.description?.trim(),
  scopes: copyScopes(value.scopes).map(scope => ({ ...scope, eventTypes: [...new Set(scope.eventTypes)] })),
  channelProvider: value.channelProvider, channelConfiguration: copyConfiguration(value.channelConfiguration),
})
export const channelLabel = (id?: string, t?: (key: string) => string) => id === 'http-hook' && t
  ? t('ThirdPartyApplication.subscription.httpHook') : id || '-'
