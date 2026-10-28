<template>
  <section class="event-document" :aria-label="$t('ThirdPartyApplication.subscription.eventFields')">
    <div class="document-heading">
      <div class="document-identity">
        <h3>{{ event.name }}</h3>
        <a-typography-text type="secondary">{{ event.id }}<template v-if="event.version"> · v{{ event.version }}</template></a-typography-text>
      </div>
    </div>
    <p v-if="event.description" class="document-description">{{ event.description }}</p>
    <p v-if="missingDescriptions" class="document-note">{{ $t('ThirdPartyApplication.subscription.missingFieldDescriptions') }}</p>
    <a-table :key="event.id" :data-source="fields" row-key="key" :pagination="false"
      :scroll="{ x: 560 }" table-layout="fixed" class="field-table">
      <a-table-column key="name" :title="$t('ThirdPartyApplication.subscription.fieldName')" :width="150">
        <template #default="{ record }">
          <code>{{ record.name }}</code>
        </template>
      </a-table-column>
      <a-table-column key="description" :title="$t('ApiApplication.subscription.description')">
        <template #default="{ record }">
          <div class="field-description">
            <span v-if="record.description">{{ record.description }}</span>
            <span v-if="record.enumValues !== undefined">{{ $t('ThirdPartyApplication.debug.doc.enum') }}：<code>{{ record.enumValues }}</code></span>
            <span v-if="record.example !== undefined">{{ $t('ThirdPartyApplication.debug.doc.example') }}：<code>{{ record.example }}</code></span>
          </div>
        </template>
      </a-table-column>
      <a-table-column key="type" :title="$t('ThirdPartyApplication.subscription.fieldType')" data-index="type" :width="100" />
      <template #emptyText><CloudEmpty :description="$t('ThirdPartyApplication.subscription.noFieldSchema')" /></template>
    </a-table>
  </section>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { TableColumn as ATableColumn } from 'ant-design-vue'
import type { SubscriptionEvent } from '@authentication-manager-ui/api/application-center/applicationSubscription'
import type { SubscriptionMetadataField } from '../subscriptionMetadata'
defineProps<{ event: SubscriptionEvent; fields: SubscriptionMetadataField[]; missingDescriptions: boolean }>()
const { t: $t } = useI18n()
</script>
<style scoped>
.event-document { min-width: 0; }
.document-heading { display: flex; align-items: start; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-3); }
.document-identity { min-width: 0; overflow-wrap: anywhere; }
.document-heading h3 { margin: 0 0 var(--space-1); font-size: var(--fs-14); font-weight: 600; }
.document-identity :deep(.ant-typography), .document-note { font-size: var(--fs-12); }
.document-description { overflow-wrap: anywhere; max-height: 8rem; overflow: auto; }
.document-note { color: var(--ink-4); margin-bottom: var(--space-3); }
.field-table :deep(.ant-table-cell) { vertical-align: top; overflow-wrap: anywhere; }
.field-description { display: grid; gap: var(--space-1); }
</style>
