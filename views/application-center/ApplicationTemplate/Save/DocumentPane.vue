<template>
  <section class="template-document">
    <MarkdownEditor
      v-model="draftProxy"
      :rows="22"
      :placeholder="$t('ApplicationTemplate.document.placeholder')"
      :empty-description="$t('ApplicationTemplate.document.empty')"
      :disabled="!canUpdate"
    />
    <div v-if="canUpdate" class="template-document__actions">
      <a-button :disabled="!dirty" @click="$emit('reset')">
        {{ $t('ApplicationTemplate.common.cancel') }}
      </a-button>
      <a-button type="primary" :loading="saving" :disabled="!dirty" @click="$emit('save')">
        {{ $t('ApplicationTemplate.common.confirm') }}
      </a-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  draft: { type: String, default: '' },
  dirty: { type: Boolean, default: false },
  canUpdate: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits<{
  (event: 'update:draft', value: string): void
  (event: 'reset'): void
  (event: 'save'): void
}>()
const draftProxy = computed({ get: () => props.draft, set: value => emit('update:draft', value) })
</script>

<style scoped>
.template-document { display: flex; flex-direction: column; gap: var(--space-4); }
.template-document__actions { display: flex; justify-content: flex-end; gap: var(--space-2); }
</style>
