<template>
  <div
    v-if="canEdit && (!activeSection || activeSection === section)"
    class="basis-section-actions"
  >
    <j-permission-button
      v-if="!activeSection"
      has-permission="system/Basis:update"
      @click="emit('edit', section)"
    >
      <template #icon><AIcon type="EditOutlined" /></template>
      {{ $t('Basis.Config.edit') }}
    </j-permission-button>
    <template v-else>
      <a-button :disabled="saving" @click="emit('cancel')">
        {{ $t('Basis.Config.cancel') }}
      </a-button>
      <j-permission-button
        has-permission="system/Basis:update"
        type="primary"
        :loading="saving"
        @click="emit('save')"
      >
        {{ $t('Basis.Config.save') }}
      </j-permission-button>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { BasisSectionKey } from '../types'

defineProps<{
  section: BasisSectionKey
  activeSection?: BasisSectionKey
  canEdit: boolean
  saving: boolean
}>()

const emit = defineEmits<{
  (event: 'edit', section: BasisSectionKey): void
  (event: 'cancel'): void
  (event: 'save'): void
}>()
</script>

<style scoped lang="less">
.basis-section-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
</style>