<template>
  <a-modal
    :open="open"
    :title="dialogTitle"
    :width="1000"
    :mask-closable="false"
    :body-style="{ maxHeight: 'calc(100vh - 16rem)', overflowY: 'auto' }"
    destroy-on-close
    class="edit-dialog-container"
    @cancel="$emit('update:open', false)"
  >
    <a-form layout="vertical">
      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item :label="$t('Announcement.editor.title')" required>
            <a-input
              v-model:value="form.title"
              :maxlength="200"
              show-count
              :placeholder="$t('Announcement.editor.titlePlaceholder')"
            >
              <template #suffix>
                <AnnouncementI18nTrigger @configure="openTextI18n('title')" />
              </template>
            </a-input>
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item :label="$t('Announcement.editor.summary')">
            <a-input
              v-model:value="form.summary"
              :maxlength="120"
              show-count
              :placeholder="$t('Announcement.editor.summaryPlaceholder')"
            >
              <template #suffix>
                <AnnouncementI18nTrigger @configure="openTextI18n('summary')" />
              </template>
            </a-input>
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item :label="$t('Announcement.editor.type')" required>
            <a-input
              v-model:value="form.type"
              :maxlength="64"
              show-count
              :placeholder="$t('Announcement.editor.typePlaceholder')"
            >
              <template #suffix>
                <AnnouncementI18nTrigger @configure="openTextI18n('type')" />
              </template>
            </a-input>
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item :label="$t('Announcement.editor.popup')">
            <a-space direction="vertical" :size="4">
              <a-switch v-model:checked="form.popup" />
              <span class="announcement-form-hint">{{ $t('Announcement.editor.popupHint') }}</span>
            </a-space>
          </a-form-item>
        </a-col>
        <a-col :span="16">
          <a-form-item
            :label="$t('Announcement.editor.deliveryScope')"
            required
            :validate-status="scopeInvalid ? 'error' : undefined"
            :help="scopeInvalid ? $t('Announcement.editor.deliveryScopeRequired') : undefined"
          >
            <a-space direction="vertical" :size="8" class="announcement-delivery-scope">
              <a-checkbox v-model:checked="form.saas">
                {{ $t('Announcement.editor.saas') }}
              </a-checkbox>
              <a-select
                v-model:value="form.regionIds"
                mode="multiple"
                allow-clear
                show-search
                :loading="regionLoading"
                :options="regionOptions"
                :max-tag-count="3"
                :placeholder="$t('Announcement.editor.regionsPlaceholder')"
              />
              <span class="announcement-form-hint">{{ $t('Announcement.editor.deliveryScopeHint') }}</span>
            </a-space>
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item :label="$t('Announcement.editor.content')" required>
        <AnnouncementI18nMarkdownEditor
          v-model="form.i18nMessages.content"
          :rows="14"
          :placeholder="$t('Announcement.editor.contentPlaceholder')"
        />
      </a-form-item>
    </a-form>

    <template #footer>
      <a-button :disabled="loading" @click="$emit('update:open', false)">
        {{ $t('Announcement.action.cancel') }}
      </a-button>
      <j-permission-button
        :has-permission="record ? 'system/Announcement:edit' : 'system/Announcement:add'"
        :loading="loading"
        :disabled="!canSubmit"
        @click="submit(false)"
      >
        {{ $t('Announcement.action.saveDraft') }}
      </j-permission-button>
      <j-permission-button
        :has-permission="record ? 'system/Announcement:edit' : 'system/Announcement:add'"
        type="primary"
        :loading="loading"
        :disabled="!canSubmit"
        @click="submit(true)"
      >
        {{ $t('Announcement.action.savePublish') }}
      </j-permission-button>
    </template>
  </a-modal>

  <AnnouncementI18nTextDialog
    :visible="i18nDialogVisible"
    :title="i18nDialogTitle"
    :data="i18nDialogData"
    :max-length="i18nDialogMaxLength"
    :textarea="i18nField === 'summary'"
    @update:visible="i18nDialogVisible = $event"
    @confirm="saveTextI18n"
  />
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AnnouncementDraft, AnnouncementRecord } from '../types'
import { useAnnouncementRegions } from '../hooks/useAnnouncementRegions'
import {
  mergeLegacyAnnouncementI18n,
  normalizeAnnouncementI18n,
  resolveCompatibilityText,
  resolveLocalizedText,
  updateAnnouncementLocaleText,
  type AnnouncementI18n,
  type AnnouncementI18nField,
} from '../announcementI18n'
import AnnouncementI18nMarkdownEditor from './AnnouncementI18nMarkdownEditor.vue'
import AnnouncementI18nTextDialog from './AnnouncementI18nTextDialog.vue'
import AnnouncementI18nTrigger from './AnnouncementI18nTrigger.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  record: { type: Object as PropType<AnnouncementRecord>, default: undefined },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits<{
  (event: 'update:open', open: boolean): void
  (event: 'save', draft: AnnouncementDraft): void
}>()

const { t: $t, locale } = useI18n()
const form = reactive({
  title: '',
  summary: '',
  type: '',
  popup: false,
  saas: true,
  regionIds: [] as string[],
  i18nMessages: {} as AnnouncementI18n,
})
const {
  options: regionOptions,
  loading: regionLoading,
  load: loadRegions,
} = useAnnouncementRegions()
const i18nDialogVisible = ref(false)
const i18nField = ref<Extract<AnnouncementI18nField, 'title' | 'summary' | 'type'>>('title')
let initialTitle = ''
let initialSummary = ''

const currentLanguage = computed(() => String(locale.value || 'zh').replace('_', '-').split('-')[0])
const dialogTitle = computed(() => props.record
  ? $t('Announcement.editor.editTitle')
  : $t('Announcement.editor.createTitle'))
const i18nDialogTitle = computed(() => $t('Announcement.i18n.dialogTitle', {
  field: $t(`Announcement.editor.${i18nField.value}`),
}))
const i18nDialogData = computed(() => form.i18nMessages[i18nField.value] ?? {})
const i18nDialogMaxLength = computed(() => ({ title: 200, summary: 120, type: 64 })[i18nField.value])
const scopeInvalid = computed(() => !form.saas && form.regionIds.length === 0)
const canSubmit = computed(() => {
  const i18n = normalizeAnnouncementI18n(form.i18nMessages)
  return Boolean(
    resolveCompatibilityText(i18n.title, form.title.trim())
    && resolveCompatibilityText(i18n.content)
    && form.type.trim()
    && !scopeInvalid.value,
  )
})

watch(() => props.open, (open) => {
  if (open) {
    resetForm()
    void loadRegions()
  }
})

/** 每次打开都从当前记录重建草稿；历史公告没有范围时按仅 SaaS 端回显。 */
function resetForm() {
  const record = props.record
  const i18n = mergeLegacyAnnouncementI18n(record?.i18nMessages, {
    title: record?.legacyTitle,
    summary: record?.legacySummary,
    type: record?.type,
    content: record?.legacyContent,
  })
  form.i18nMessages = i18n
  form.title = resolveLocalizedText(i18n.title, currentLanguage.value) || record?.title || ''
  form.summary = resolveLocalizedText(i18n.summary, currentLanguage.value) || record?.summary || ''
  initialTitle = form.title
  initialSummary = form.summary
  form.type = record?.type || ''
  form.popup = record?.popup === true
  form.saas = record?.deliveryScope?.saas ?? true
  form.regionIds = [...(record?.deliveryScope?.regionIds || [])]
}

function openTextI18n(field: typeof i18nField.value) {
  i18nField.value = field
  i18nDialogVisible.value = true
}

function saveTextI18n(messages: Record<string, string>) {
  const field = i18nField.value
  form.i18nMessages = { ...form.i18nMessages, [field]: messages }
  if (field === 'title' || field === 'summary') {
    form[field] = resolveLocalizedText(messages, currentLanguage.value)
  }
}

function submit(publish: boolean) {
  if (!canSubmit.value) return
  let i18n = normalizeAnnouncementI18n(form.i18nMessages)
  if (form.title.trim() !== initialTitle) {
    i18n = updateAnnouncementLocaleText(i18n, 'title', currentLanguage.value, form.title)
  }
  if (form.summary.trim() !== initialSummary) {
    i18n = updateAnnouncementLocaleText(i18n, 'summary', currentLanguage.value, form.summary)
  }
  emit('save', {
    id: props.record?.id,
    title: form.title.trim(),
    summary: form.summary.trim() || undefined,
    content: resolveCompatibilityText(i18n.content),
    type: form.type.trim(),
    popup: form.popup,
    deliveryScope: {
      saas: form.saas,
      regionIds: [...form.regionIds],
    },
    publish,
    others: props.record?.others,
    i18nMessages: i18n,
  })
}
</script>

<style scoped lang="less">
.announcement-form-hint {
  color: var(--jet-theme-text-secondary);
}

.announcement-delivery-scope {
  width: 100%;
}
</style>
