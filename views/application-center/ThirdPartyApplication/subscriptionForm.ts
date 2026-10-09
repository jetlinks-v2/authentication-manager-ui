import type { SubscriptionConfiguration, SubscriptionScope } from '@authentication-manager-ui/api/application-center/applicationSubscription'

// 配置来自 JSON 接口，深复制保证编辑嵌套配置不会改动列表记录或详情快照。
export const copyConfiguration = (value: Record<string, unknown> = {}): Record<string, unknown> => JSON.parse(JSON.stringify(value))
export const copyScopes = (scopes: SubscriptionScope[] = []): SubscriptionScope[] => scopes.map(scope => ({
  eventTypes: [...scope.eventTypes], configuration: copyConfiguration(scope.configuration),
}))
export const subscriptionPayload = (value: SubscriptionConfiguration): SubscriptionConfiguration => ({
  name: value.name.trim(), description: value.description?.trim(),
  scopes: copyScopes(value.scopes).map(scope => ({ ...scope, eventTypes: [...new Set(scope.eventTypes)] })),
  channelProvider: value.channelProvider, channelConfiguration: copyConfiguration(value.channelConfiguration),
})
export const scopeEventCount = (scopes: SubscriptionScope[] = []) => new Set(scopes.flatMap(scope => scope.eventTypes)).size
export const channelLabel = (id?: string, t?: (key: string) => string) => id === 'http-hook' && t
  ? t('ThirdPartyApplication.subscription.httpHook') : id || '-'
