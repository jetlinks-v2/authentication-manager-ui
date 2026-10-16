<template>
  <div class="resource-grant">
    <a-space wrap>
      <a-select :value="modelValue.type" :options="typeOptions" :disabled="disabled" class="resource-type" @change="changeType" />
      <a-select :value="modelValue.mode" :disabled="disabled" class="resource-mode" @change="changeMode">
        <a-select-option value="all_current">{{ $t('ThirdPartyApplication.project.allCurrent') }}</a-select-option>
        <a-select-option value="selected">{{ $t('ThirdPartyApplication.project.selectedResources') }}</a-select-option>
      </a-select>
      <a-button type="text" danger :disabled="disabled" @click="emit('remove')">{{ $t('ApiApplication.actions.delete') }}</a-button>
    </a-space>
    <template v-if="modelValue.mode === 'selected'">
      <a-select :value="modelValue.resourceIds" mode="multiple" show-search :filter-option="false" :options="options"
        :disabled="disabled || !runtimeReady || !supported" :loading="loading" class="resource-select"
        :placeholder="$t('ThirdPartyApplication.project.searchResources')" @search="load" @change="changeIds" />
      <a-alert v-if="!supported" type="warning" show-icon :message="$t('ThirdPartyApplication.project.resourceQueryUnavailable')" />
      <a-alert v-else-if="!runtimeReady" type="warning" show-icon :message="$t('ThirdPartyApplication.project.runtimeContextMissing')" />
      <a-alert v-if="error" type="error" show-icon :message="error" />
      <a-button v-if="hasMore && supported" type="link" :loading="loading" :disabled="disabled" @click="more">{{ $t('ThirdPartyApplication.project.loadMore') }}</a-button>
    </template>
    <p v-else class="resource-note">{{ $t('ThirdPartyApplication.project.allCurrentHint') }}</p>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ResourceGrant } from '@authentication-manager-ui/api/application-center/thirdPartyIntegration'
import { useResourceOptions } from '../useResourceOptions'
import { resourceLabel } from '../useAuthorizationForm'
const props = defineProps<{ modelValue: ResourceGrant; types: string[]; disabled?: boolean; runtimeReady: boolean }>()
const emit = defineEmits<{ (event: 'update:modelValue', value: ResourceGrant): void; (event: 'remove'): void }>()
const { t: $t } = useI18n()
const typeOptions = computed(() => [...new Set([...props.types, props.modelValue.type])].map(type => ({
  value: type, label: resourceLabel(type, $t), disabled: !props.types.includes(type),
})))
const { options, loading, error, supported, load, more, hasMore } = useResourceOptions(() => props.modelValue, () => props.runtimeReady && !props.disabled)
const changeType = (type: string) => emit('update:modelValue', { type, mode: props.modelValue.mode, resourceIds: [] })
const changeMode = (mode: ResourceGrant['mode']) => emit('update:modelValue', { ...props.modelValue, mode, resourceIds: [] })
const changeIds = (resourceIds: string[]) => emit('update:modelValue', { ...props.modelValue, resourceIds })
</script>
<style scoped>
.resource-grant { padding: 12px; border: 1px solid var(--line-strong); border-radius: var(--r-2); margin-bottom: 12px; }
.resource-type { min-width: 150px; }.resource-mode { min-width: 200px; }.resource-select { width: 100%; margin: 12px 0; }
.resource-note { margin: 8px 0 0; color: var(--ink-4); }
</style>
