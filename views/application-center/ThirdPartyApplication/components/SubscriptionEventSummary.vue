<template>
  <div class="event-summary">
    <span v-if="!catalogReady">{{ $t('ThirdPartyApplication.subscription.eventCount', { count: ids.length }) }}</span>
    <template v-else>
      <a-tooltip v-for="(label, index) in labels.slice(0, 2)" :key="index" :title="label" :trigger="['hover', 'focus']">
        <span class="category-label" tabindex="0">{{ label }}</span>
      </a-tooltip>
      <a-popover v-if="labels.length > 2" trigger="click" :title="$t('ThirdPartyApplication.subscription.eventCategories')">
        <template #content><ul class="category-list"><li v-for="(label, index) in labels" :key="index">{{ label }}</li></ul></template>
        <a-button type="link" size="small" class="more-categories" :aria-label="$t('ThirdPartyApplication.subscription.allCategories', { count: labels.length })">+{{ labels.length - 2 }}</a-button>
      </a-popover>
      <span v-if="!labels.length">-</span>
    </template>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SubscriptionEventProvider, SubscriptionScope } from '@authentication-manager-ui/api/application-center/applicationSubscription'
import { eventGroupLabels } from '../subscriptionEvents'
const props = defineProps<{ scopes: SubscriptionScope[]; providers: SubscriptionEventProvider[]; catalogReady: boolean }>()
const { t: $t } = useI18n()
const ids = computed(() => [...new Set(props.scopes.flatMap(scope => scope.eventTypes))])
const labels = computed(() => eventGroupLabels(ids.value, props.providers, $t))
</script>
<style scoped>
.event-summary { display: flex; align-items: center; gap: var(--space-2); min-width: 0; }
.category-label { min-width: 0; max-width: 9rem; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.category-label + .category-label { padding-left: var(--space-2); border-left: 1px solid var(--line); }
.more-categories { flex: none; padding-inline: var(--space-1); }
.category-list { display: grid; gap: var(--space-2); max-height: 15rem; max-width: min(22rem, 75vw); margin: 0; padding-left: var(--space-4); overflow: auto; overflow-wrap: anywhere; }
</style>
