<template>
  <a-form layout="vertical">
    <a-form-item :label="$t('ThirdPartyApplication.project.scopes')" required>
      <a-checkbox-group :value="modelValue.grantedScopes" :disabled="disabled || !profile" @change="changeScopes" class="scope-options">
        <a-checkbox v-for="scope in scopeOptions" :key="scope" :value="scope">{{ scopeLabel(scope, $t) }}</a-checkbox>
      </a-checkbox-group>
      <a-empty v-if="!scopeOptions.length" :description="$t('ThirdPartyApplication.project.approvalUnavailable')" />
    </a-form-item>
    <a-form-item :label="$t('ThirdPartyApplication.project.resourceGrants')">
      <ResourceGrantEditor v-for="(grant, index) in modelValue.resourceGrants" :key="index" :model-value="grant"
        :types="availableTypes(grant.type)" :disabled="disabled || !profile" :runtime-ready="runtimeReady"
        @update:model-value="updateGrant(index, $event)" @remove="removeGrant(index)" />
      <a-button :disabled="disabled || !nextType" @click="addGrant">{{ $t('ThirdPartyApplication.project.addResourceGrant') }}</a-button>
      <p class="field-note">{{ $t('ThirdPartyApplication.project.emptyResourcesHint') }}</p>
    </a-form-item>
    <a-form-item :label="$t('ThirdPartyApplication.project.reason')" required>
      <a-input :value="modelValue.reason" :maxlength="512" show-count :disabled="disabled"
        :placeholder="$t('ThirdPartyApplication.project.reasonPlaceholder')" @update:value="updateReason" />
    </a-form-item>
  </a-form>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AuthorizationDraft, AvailableApplication, ResourceGrant } from '@authentication-manager-ui/api/application-center/thirdPartyIntegration'
import ResourceGrantEditor from './ResourceGrantEditor.vue'
import { scopeLabel } from '../useAuthorizationForm'
const props = defineProps<{ modelValue: AuthorizationDraft; profile?: AvailableApplication; disabled?: boolean; runtimeReady: boolean }>()
const emit = defineEmits<{ (event: 'update:modelValue', value: AuthorizationDraft): void }>()
const { t: $t } = useI18n()
const scopeOptions = computed(() => [...new Set([...(props.profile?.approvedScopes || []), ...props.modelValue.grantedScopes])])
const availableTypes = (current = '') => (props.profile?.approvedResourceTypes || []).filter(type => type === current || !props.modelValue.resourceGrants.some(grant => grant.type === type))
const nextType = computed(() => availableTypes()[0])
const changeScopes = (grantedScopes: string[]) => emit('update:modelValue', { ...props.modelValue, grantedScopes })
const updateReason = (reason: string) => emit('update:modelValue', { ...props.modelValue, reason })
const updateGrant = (index: number, value: ResourceGrant) => emit('update:modelValue', { ...props.modelValue, resourceGrants: props.modelValue.resourceGrants.map((grant, i) => i === index ? value : grant) })
const removeGrant = (index: number) => emit('update:modelValue', { ...props.modelValue, resourceGrants: props.modelValue.resourceGrants.filter((_, i) => i !== index) })
const addGrant = () => { if (nextType.value) emit('update:modelValue', { ...props.modelValue, resourceGrants: [...props.modelValue.resourceGrants, { type: nextType.value, mode: 'selected', resourceIds: [] }] }) }
</script>
<style scoped>.scope-options { display: flex; flex-wrap: wrap; gap: 16px; }.field-note { margin-top: 8px; color: var(--ink-4); }</style>
