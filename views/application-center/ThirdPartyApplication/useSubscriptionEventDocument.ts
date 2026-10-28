import { computed } from 'vue'
import type { SubscriptionEventProvider } from '@authentication-manager-ui/api/application-center/applicationSubscription'
import { hasMissingFieldDescriptions, subscriptionMetadataFields } from './subscriptionMetadata'

interface DocumentSource {
  providers: SubscriptionEventProvider[]
  eventId?: string
}

export const useSubscriptionEventDocument = (source: DocumentSource) => {
  const eventOptions = computed(() => source.providers.filter(provider => provider.events.length).map(provider => ({
    label: provider.name, key: provider.id,
    options: provider.events.map(event => ({ value: event.id, label: event.name })),
  })))
  const events = computed(() => source.providers.flatMap(provider => provider.events))
  const activeEvent = computed(() => events.value.find(event => event.id === source.eventId) || events.value[0])
  const fields = computed(() => activeEvent.value ? subscriptionMetadataFields(activeEvent.value) : [])
  const missingDescriptions = computed(() => hasMissingFieldDescriptions(fields.value))
  return { eventOptions, activeEvent, fields, missingDescriptions }
}
