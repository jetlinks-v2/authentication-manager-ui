<template>
  <DetailHeader
    class="template-summary"
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
    <template #description>
      <InputEditable
        v-if="canUpdate"
        :value="detail.description || ''"
        :max-length="512"
        :disabled="!canUpdate || saving"
        :text-style="descriptionStyle"
        @change="$emit('update-description', $event)"
      />
      <span v-else>{{ detail.description || '--' }}</span>
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
        <span><strong>ID</strong>{{ detail.id || '--' }}</span>
        <span><strong>{{ $t('ApplicationTemplate.field.code') }}</strong>{{ detail.code || '--' }}</span>
        <span class="template-summary__tags">
          <strong>{{ $t('ApplicationTemplate.tag.tags') }}</strong>
          <TemplateTags
            :tags="tags"
            :tag-ids="tagIds"
            :tree-data="tagTree"
            :editable="canUpdate"
            @load-options="$emit('load-tag-options')"
            @save="$emit('save-tags', $event)"
          />
        </span>
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
import TemplateTags from './TemplateTags.vue'

const props = defineProps({
  detail: { type: Object as PropType<BusinessApplicationTemplate>, required: true },
  tags: { type: Array as PropType<Array<{ id: string; name: string }>>, default: () => [] },
  tagIds: { type: Array as PropType<string[]>, default: () => [] },
  tagTree: { type: Array as PropType<any[]>, default: () => [] },
  state: { type: String, default: 'enabled' },
  canUpdate: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits<{
  (event: 'update-name', value: string): void
  (event: 'update-description', value: string): void
  (event: 'update-icon', value: string): void
  (event: 'toggle-state'): void
  (event: 'load-tag-options'): void
  (event: 'save-tags', ids: string[]): void
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
const descriptionStyle: CSSProperties = { color: 'var(--ink-2)', lineHeight: 1.6 }

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
.template-summary__info > span { display: inline-flex; align-items: center; gap: var(--space-2); min-width: 0; }
.template-summary__info strong { color: var(--ink-3); font-weight: 500; }
.template-summary__title { color: var(--ink-1); font-size: var(--fs-18); font-weight: 650; line-height: 2rem; }
.template-summary__tags { flex: 1 1 20rem; }
.template-summary__icon-button { display: inline-flex; padding: 0; border: 0; border-radius: var(--r-3); background: transparent; cursor: pointer; }
</style>
