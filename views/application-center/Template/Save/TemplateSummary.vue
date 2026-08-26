<template>
  <DetailHeader
    class="template-summary"
    title=""
    :show-back="true"
    :back-title="$t('ApplicationTemplate.detail.back')"
  >
    <template #title>
      <InputEditable
        v-if="canUpdate"
        :value="detail.name || detail.code || detail.id"
        :max-length="64"
        :disabled="!canUpdate || saving"
        :text-style="titleStyle"
        @change="$emit('update-name', $event)"
      />
      <span v-else class="template-summary__title">{{ detail.name || detail.code || detail.id }}</span>
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
            :fallback-text="detail.name || detail.code || detail.id"
          />
        </button>
        <AIconValueView
          v-else
          :value="detail.icon"
          :size="44"
          :border-radius="10"
          :fallback-text="detail.name || detail.code || detail.id"
        />
        <div class="template-summary__meta">
          <span class="template-summary__meta-item template-summary__description-item">
            <strong>{{ $t('ApplicationTemplate.field.description') }}</strong>
            <span v-if="canUpdate" class="template-summary__editable-value">
              <InputEditable
                :value="detail.description || ''"
                :max-length="512"
                :disabled="!canUpdate || saving"
                :text-style="descriptionStyle"
                @change="$emit('update-description', $event)"
              />
            </span>
            <span v-else class="template-summary__value" :title="detail.description || '--'">
              {{ detail.description || '--' }}
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
      :preview-fallback="detail.name || detail.code || detail.id"
    />
  </a-modal>
</template>

<script setup lang="ts">
import type { CSSProperties, PropType } from 'vue'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { DetailHeader } from '@jetlinks-web-core/components'
import { IconValueEditor as AIconValueEditor, IconValueView as AIconValueView } from '@jetlinks-web-core/components/IconValue'
import type { BusinessApplicationTemplate } from '@authentication-manager-ui/api/application-center/applicationTemplate'

const props = defineProps({
  detail: { type: Object as PropType<BusinessApplicationTemplate>, required: true },
  state: { type: String, default: 'enabled' },
  canUpdate: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits<{
  (event: 'update-name', value: string): void
  (event: 'update-description', value: string): void
  (event: 'update-template-url', value: string): void
  (event: 'update-icon', value: string): void
  (event: 'toggle-state'): void
}>()
const { t: $t } = useI18n()
const iconEditorOpen = ref(false)
const iconDraft = ref('')
const stateActionText = computed(() => $t(
  props.state === 'enabled' ? 'ApplicationTemplate.common.disable' : 'ApplicationTemplate.common.enable',
))
const titleStyle: CSSProperties = {
  color: 'var(--ink-1)', fontSize: 'var(--fs-18)', fontWeight: 650, lineHeight: '2rem',
}
const descriptionStyle: CSSProperties = { color: 'var(--ink-2)', lineHeight: 1.5 }

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
.template-summary__editable-value :deep(> div),
.template-summary__editable-value :deep(> div > div:first-child) { min-width: 0; max-width: 100%; }
.template-summary__editable-value :deep(.ant-input) { width: min(28rem, 100%); }
@media (max-width: 64rem) {
  .template-summary__meta { flex-wrap: wrap; }
  .template-summary__description-item,
  .template-summary__url-item { flex-basis: 100%; }
}
</style>
