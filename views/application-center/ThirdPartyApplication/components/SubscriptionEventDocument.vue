<template>
  <div class="event-reference">
    <div v-if="eventOptions.length" class="reference-selector">
      <label for="subscription-document-event">{{ $t('ThirdPartyApplication.subscription.eventName') }}</label>
      <a-select id="subscription-document-event" :value="activeEvent?.id" :options="eventOptions" show-search option-filter-prop="label"
        :placeholder="$t('ThirdPartyApplication.subscription.selectDocumentEvent')" @update:value="emit('update:eventId', $event)" />
    </div>
    <SubscriptionEventFields v-if="activeEvent" :event="activeEvent" :fields="fields" :missing-descriptions="missingDescriptions" />
    <CloudEmpty v-else :description="$t('ApiApplication.subscription.noEvents')" />
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { SubscriptionEventProvider } from '@authentication-manager-ui/api/application-center/applicationSubscription'
import { useSubscriptionEventDocument } from '../useSubscriptionEventDocument'
import SubscriptionEventFields from './SubscriptionEventFields.vue'
const props = defineProps<{ providers: SubscriptionEventProvider[]; eventId?: string }>()
const emit = defineEmits<{ 'update:eventId': [eventId: string] }>()
const { t: $t } = useI18n()
const { eventOptions, activeEvent, fields, missingDescriptions } = useSubscriptionEventDocument(props)
</script>
<style scoped>
.event-reference { display: grid; gap: var(--space-5); min-width: 0; }
.reference-selector { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: var(--space-3); }
.reference-selector label { color: var(--ink-2); font-size: var(--fs-14); }
@media (max-width: 40rem) { .reference-selector { grid-template-columns: minmax(0, 1fr); gap: var(--space-2); } }
</style>
