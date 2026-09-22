<template>
  <div class="template-summary-content">
    <DetailHeader
      class="template-summary"
      title=""
      :show-back="true"
      :back-title="$t('ApplicationTemplate.detail.back')"
    >
      <template #title>
        <span v-if="canUpdate" class="template-summary__editable-text">
          <InputEditable
            :value="displayName"
            :max-length="64"
            :disabled="saving"
            :text-style="titleStyle"
            @change="updateText('name', $event)"
          />
          <I18nInputTrigger @configure="openI18nDialog('name')" />
        </span>
        <span v-else class="template-summary__title">{{ displayName }}</span>
      </template>
      <template #titleExtra>
        <a-tag :color="state === 'enabled' ? 'green' : 'default'">
          {{ state === 'enabled' ? $t('ApplicationTemplate.common.enabled') : $t('ApplicationTemplate.common.disabled') }}
        </a-tag>
      </template>
      <template #info>
        <div class="template-summary__info">
          <button
            v-if="canUpdate"
            type="button"
            class="template-summary__icon-button"
            :title="$t('ApplicationTemplate.field.editIcon')"
            @click="iconEditorOpen = true"
          >
            <AIconValueView
              :value="detail.icon"
              :size="44"
              :border-radius="10"
              :fallback-text="displayName"
            />
          </button>
          <AIconValueView
            v-else
            :value="detail.icon"
            :size="44"
            :border-radius="10"
            :fallback-text="displayName"
          />
          <div class="template-summary__meta">
            <span class="template-summary__meta-item template-summary__description-item">
              <strong>{{ $t('ApplicationTemplate.field.description') }}</strong>
              <span v-if="canUpdate" class="template-summary__editable-value">
                <span class="template-summary__editable-text">
                  <InputEditable
                    :value="displayDescription"
                    :max-length="512"
                    :disabled="saving"
                    :text-style="descriptionStyle"
                    @change="updateText('description', $event)"
                  />
                  <I18nInputTrigger @configure="openI18nDialog('description')" />
                </span>
              </span>
              <span v-else class="template-summary__value" :title="displayDescription || '--'">
                {{ displayDescription || '--' }}
              </span>
            </span>
            <span class="template-summary__meta-item template-summary__url-item">
              <strong>{{ $t('ApplicationTemplate.field.templateUrl') }}</strong>
              <span v-if="canUpdate" class="template-summary__editable-value">
                <InputEditable
                  :value="detail.templateUrl || ''"
                  :max-length="64"
                  :disabled="!canUpdate || saving"
                  :text-style="descriptionStyle"
                  @change="$emit('update-template-url', $event)"
                />
              </span>
              <span v-else class="template-summary__value" :title="detail.templateUrl || '--'">
                {{ detail.templateUrl || '--' }}
              </span>
            </span>
            <span class="template-summary__meta-item">
              <strong>ID</strong>
              <span class="template-summary__value" :title="detail.id || '--'">{{ detail.id || '--' }}</span>
            </span>
            <span class="template-summary__meta-item">
              <strong>{{ $t('ApplicationTemplate.field.code') }}</strong>
              <span class="template-summary__value" :title="detail.code || '--'">{{ detail.code || '--' }}</span>
            </span>
          </div>
        </div>
      </template>
      <template #actions>
        <a-popconfirm
          v-if="canUpdate"
          :title="$t('ApplicationTemplate.message.confirmChangeStatus', [stateActionText])"
          @confirm="$emit('toggle-state')"
        >
          <a-button :danger="state === 'enabled'" :loading="saving">
            {{ stateActionText }}
          </a-button>
        </a-popconfirm>
      </template>
    </DetailHeader>
  </div>

  <a-modal
    v-model:open="iconEditorOpen"
    :title="$t('ApplicationTemplate.field.icon')"
    :confirm-loading="saving"
    @ok="saveIcon"
    @cancel="resetIcon"
  >
    <AIconValueEditor
      v-model="iconDraft"
      :preview-size="56"
      :preview-fallback="displayName"
    />
  </a-modal>

  <I18nTextDialog
    :visible="i18nDialogOpen"
    :title="i18nDialogTitle"
    :data="i18nDialogData"
    :display-value="i18nDialogDisplayValue"
    :max-length="i18nDialogField === 'name' ? 64 : 512"
    :textarea="i18nDialogField === 'description'"
    @update:visible="i18nDialogOpen = $event"
    @confirm="saveI18nText"
  />
</template>

<script setup lang="ts">
import type { CSSProperties, PropType } from 'vue'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { DetailHeader } from '@jetlinks-web-core/components'
import { IconValueEditor as AIconValueEditor, IconValueView as AIconValueView } from '@jetlinks-web-core/components/IconValue'
import { I18nInputTrigger, I18nTextDialog } from '@jetlinks-web-core/components'
import type { BusinessApplicationTemplate, I18nMessages } from '@authentication-manager-ui/api/application-center/applicationTemplate'

type I18nTextField = 'name' | 'description'

const props = defineProps({
  detail: { type: Object as PropType<BusinessApplicationTemplate>, required: true },
  state: { type: String, default: 'enabled' },
  canUpdate: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits<{
  (event: 'update-name', value: string, i18nMessages: I18nMessages): void
  (event: 'update-description', value: string, i18nMessages: I18nMessages): void
  (event: 'update-template-url', value: string): void
  (event: 'update-icon', value: string): void
  (event: 'toggle-state'): void
}>()
const { t: $t, locale } = useI18n()
const iconEditorOpen = ref(false)
const iconDraft = ref('')
const i18nDialogOpen = ref(false)
const i18nDialogField = ref<I18nTextField>('name')
const stateActionText = computed(() => $t(
  props.state === 'enabled' ? 'ApplicationTemplate.common.disable' : 'ApplicationTemplate.common.enable',
))
const titleStyle: CSSProperties = {
  color: 'var(--ink-1)', fontSize: 'var(--fs-18)', fontWeight: 650, lineHeight: '2rem',
}
const descriptionStyle: CSSProperties = { color: 'var(--ink-2)', lineHeight: 1.5 }
const currentLanguage = computed(() => String(locale.value || 'zh').replace('_', '-').split('-')[0])
const displayName = computed(() => props.detail.i18nName || props.detail.name || props.detail.code || props.detail.id)
const displayDescription = computed(() => props.detail.i18nDescription || props.detail.description || '')
const i18nDialogTitle = computed(() => $t(
  i18nDialogField.value === 'name'
    ? 'ApplicationTemplate.field.name'
    : 'ApplicationTemplate.field.description',
))
const i18nDialogData = computed(() => props.detail.i18nMessages?.[i18nDialogField.value] || {})
const i18nDialogDisplayValue = computed(() => i18nDialogField.value === 'name'
  ? displayName.value
  : displayDescription.value)

const getFieldValue = (field: I18nTextField) => field === 'name'
  ? displayName.value
  : displayDescription.value

// Inline edits represent the active language and must preserve other translations.
const getFieldMessages = (field: I18nTextField, value: string): I18nMessages => ({
  ...(props.detail.i18nMessages || {}),
  [field]: {
    ...(props.detail.i18nMessages?.[field] || {}),
    [currentLanguage.value]: value,
  },
})

const emitTextUpdate = (field: I18nTextField, value: string, i18nMessages: I18nMessages) => {
  if (field === 'name') emit('update-name', value, i18nMessages)
  else emit('update-description', value, i18nMessages)
}

const updateText = (field: I18nTextField, value: string) => {
  emitTextUpdate(field, value, getFieldMessages(field, value))
}

const openI18nDialog = (field: I18nTextField) => {
  i18nDialogField.value = field
  i18nDialogOpen.value = true
}

const saveI18nText = (messages: Record<string, string>) => {
  const field = i18nDialogField.value
  const value = messages[currentLanguage.value] || getFieldValue(field)
  emitTextUpdate(field, value, {
    ...(props.detail.i18nMessages || {}),
    [field]: messages,
  })
}

watch(iconEditorOpen, open => {
  if (open) iconDraft.value = String(props.detail.icon || '')
})
const resetIcon = () => { iconDraft.value = String(props.detail.icon || '') }
const saveIcon = () => {
  if (iconDraft.value === String(props.detail.icon || '')) {
    iconEditorOpen.value = false
    return
  }
  emit('update-icon', iconDraft.value)
  iconEditorOpen.value = false
}
</script>

<style scoped>
.template-summary-content {
  margin-bottom: var(--space-4);
}
.template-summary.cloud-detail-header {
  width: 100%;
  margin-bottom: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}
.template-summary__info { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-3); }
.template-summary__info strong { color: var(--ink-3); font-weight: 500; }
.template-summary__title { color: var(--ink-1); font-size: var(--fs-18); font-weight: 650; line-height: 2rem; }
.template-summary__icon-button { display: inline-flex; padding: 0; border: 0; border-radius: var(--r-3); background: transparent; cursor: pointer; }
.template-summary__meta { display: flex; flex: 1 1 0; align-items: center; gap: var(--space-4); min-width: 0; }
.template-summary__meta-item { display: inline-flex; flex: 0 1 14rem; align-items: center; gap: var(--space-2); min-width: 0; }
.template-summary__description-item { flex: 1 1 22rem; }
.template-summary__url-item { flex: 1 1 18rem; }
.template-summary__value,
.template-summary__editable-value { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.template-summary__editable-value { flex: 1 1 0; }
.template-summary__editable-text { display: inline-flex; align-items: center; gap: var(--space-1); min-width: 0; }
.template-summary__editable-value :deep(> div),
.template-summary__editable-value :deep(> div > div:first-child) { min-width: 0; max-width: 100%; }
.template-summary__editable-value :deep(.ant-input) { width: min(28rem, 100%); }
@media (max-width: 64rem) {
  .template-summary__meta { flex-wrap: wrap; }
  .template-summary__description-item,
  .template-summary__url-item { flex-basis: 100%; }
}
</style>
