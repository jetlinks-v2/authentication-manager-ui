import type { SubscriptionEventProvider } from '@authentication-manager-ui/api/application-center/applicationSubscription'

export const unavailableEventIds = (ids: string[], providers: SubscriptionEventProvider[]) => {
  const supported = new Set(providers.flatMap(provider => provider.events.map(event => event.id)))
  return [...new Set(ids)].filter(id => !supported.has(id))
}

export const eventGroupLabels = (ids: string[], providers: SubscriptionEventProvider[], t: (key: string) => string) => {
  const labels = providers.filter(provider => provider.events.some(event => ids.includes(event.id))).map(provider => provider.name)
  if (unavailableEventIds(ids, providers).length) labels.push(t('ApiApplication.subscription.unavailable'))
  return labels
}
