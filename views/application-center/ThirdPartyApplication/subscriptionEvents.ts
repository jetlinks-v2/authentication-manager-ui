import type { SubscriptionEventProvider, SubscriptionScope } from '@authentication-manager-ui/api/application-center/applicationSubscription'

export const groupSelection = (scope: SubscriptionScope, provider: SubscriptionEventProvider) => {
  const selected = provider.events.filter(event => scope.eventTypes.includes(event.id)).length
  return { checked: selected > 0 && selected === provider.events.length, indeterminate: selected > 0 && selected < provider.events.length }
}

// Provider 仅用于编辑聚合；用户操作时才改变该 Provider 下的具体事件，不持久化通配符。
export const selectEventGroup = (scope: SubscriptionScope, provider: SubscriptionEventProvider, checked: boolean) => {
  const ids = new Set(provider.events.map(event => event.id))
  const remaining = scope.eventTypes.filter(id => !ids.has(id))
  scope.eventTypes = checked ? [...new Set([...remaining, ...ids])] : remaining
}

export const unavailableEventIds = (ids: string[], providers: SubscriptionEventProvider[]) => {
  const supported = new Set(providers.flatMap(provider => provider.events.map(event => event.id)))
  return [...new Set(ids)].filter(id => !supported.has(id))
}

export const eventGroupSummary = (ids: string[], providers: SubscriptionEventProvider[], t: (key: string) => string) => {
  const labels = providers.filter(provider => provider.events.some(event => ids.includes(event.id))).map(provider => provider.name)
  if (unavailableEventIds(ids, providers).length) labels.push(t('ApiApplication.subscription.unavailable'))
  return labels.join(' · ') || '-'
}
