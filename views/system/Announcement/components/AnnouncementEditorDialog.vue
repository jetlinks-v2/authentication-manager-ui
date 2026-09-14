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
      <a-form-item :label="$t('Announcement.editor.title')" required>
        <a-input
          v-model:value="form.title"
          :maxlength="200"
          show-count
          :placeholder="$t('Announcement.editor.titlePlaceholder')"
        >
          <template #suffix>
            <AnnouncementI18nTrigger @configure="openI18n('title')" />
          </template>
        </a-input>
      </a-form-item>

      <a-form-item :label="$t('Announcement.editor.summary')">
        <div class="announcement-i18n-textarea-field">
          <a-textarea
            v-model:value="form.summary"
            class="announcement-summary-input"
            :maxlength="120"
            :auto-size="{ minRows: 2, maxRows: 4 }"
            show-count
            :placeholder="$t('Announcement.editor.summaryPlaceholder')"
          />
          <AnnouncementI18nTrigger
            class="announcement-i18n-textarea-field__trigger"
            @configure="openI18n('summary')"
          />
        </div>
      </a-form-item>

      <a-form-item :label="$t('Announcement.editor.type')" required>
        <a-select
          v-model:value="form.type"
          :loading="typeLoading"
          :options="typeOptions"
          :field-names="{ label: 'text', value: 'value' }"
          :placeholder="$t('Announcement.editor.typePlaceholder')"
          :get-popup-container="getPopupContainer"
        />
      </a-form-item>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item :label="$t('Announcement.editor.users')">
            <a-select
              v-model:value="form.userIds"
              mode="multiple"
              show-search
              allow-clear
              :filter-option="false"
              :loading="userLoading"
              :max-tag-count="2"
              :options="userOptions"
              :placeholder="$t('Announcement.editor.usersPlaceholder')"
              :get-popup-container="getPopupContainer"
              @change="handleUserChange"
              @search="$emit('search-users', $event)"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="$t('Announcement.editor.organizations')">
            <form-item-org
              v-model:value="form.organizationIds"
              :show-add="false"
              :extra-props="{
                multiple: true,
                allowClear: true,
                maxTagCount: 2,
                placeholder: $t('Announcement.editor.organizationsPlaceholder'),
                getPopupContainer,
              }"
            />
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
      <a-button :disabled="loading" @click="$emit('update:open', false)">{{ $t('Announcement.action.cancel') }}</a-button>
      <j-permission-button
        v-if="!publishMode"
        :has-permission="record ? 'system/Announcement:edit' : 'system/Announcement:add'"
        type="primary"
        :loading="loading"
        :disabled="!canSubmit"
        @click="submit(false)"
      >
        {{ $t('Announcement.action.save') }}
      </j-permission-button>
    </template>
  </a-modal>

  <AnnouncementI18nTextDialog
    :visible="i18nDialogVisible"
    :title="i18nDialogTitle"
    :data="currentI18nMessages"
    :max-length="currentI18nField === 'title' ? 200 : 120"
    :textarea="currentI18nField === 'summary'"
    @update:visible="i18nDialogVisible = $event"
    @confirm="saveI18nMessages"
  />
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
  AnnouncementDraft,
  AnnouncementRecord,
  AnnouncementType,
  AnnouncementUserOption,
} from '../types'
import {
  mergeLegacyAnnouncementI18n,
  normalizeAnnouncementI18n,
  resolveCompatibilityText,
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
  publishMode: { type: Boolean, default: false },
  typeOptions: { type: Array as PropType<AnnouncementType[]>, default: () => [] },
  typeLoading: { type: Boolean, default: false },
  userOptions: { type: Array as PropType<AnnouncementUserOption[]>, default: () => [] },
  userLoading: { type: Boolean, default: false },
})

const emit = defineEmits<{
  (event: 'update:open', open: boolean): void
  (event: 'save', draft: AnnouncementDraft): void
  (event: 'search-users', keyword: string): void
  (event: 'selected-users-change', userIds: string[]): void
}>()

const { t: $t, locale } = useI18n()

function getPopupContainer(triggerNode: HTMLElement) {
  return triggerNode.parentElement || document.body
}

interface AnnouncementEditorForm {
  title: string
  summary: string
  content: string
  type: string
  userIds: string[]
  organizationIds: string[]
  i18nMessages: AnnouncementI18n
}

const form = reactive<AnnouncementEditorForm>({
  title: '',
  summary: '',
  content: '',
  type: '',
  userIds: [],
  organizationIds: [],
  i18nMessages: {},
})

const i18nDialogVisible = ref(false)
const currentI18nField = ref<AnnouncementI18nField>('title')
const currentI18nMessages = computed<Record<string, string>>(() => {
  return form.i18nMessages?.[currentI18nField.value] ?? {}
})
const currentLanguage = computed(() => {
  return String(locale.value || 'zh').replace('_', '-').split('-')[0]
})
const i18nDialogTitle = computed(() => {
  const fieldKey = currentI18nField.value === 'title'
    ? 'Announcement.editor.title'
    : 'Announcement.editor.summary'
  return $t('Announcement.i18n.dialogTitle', { field: $t(fieldKey) })
})

let initialTitle = ''
let initialSummary = ''

const dialogTitle = computed(() => {
  if (props.publishMode) return $t('Announcement.editor.publishTitle')
  return props.record ? $t('Announcement.editor.editTitle') : $t('Announcement.editor.createTitle')
})

const canSubmit = computed(() => {
  const i18n = normalizeAnnouncementI18n(form.i18nMessages)
  return Boolean(
    resolveCompatibilityText(i18n.title, form.title.trim())
    && resolveCompatibilityText(i18n.content, form.content.trim())
    && form.type,
  )
})

watch(() => props.open, (open) => {
  if (open) resetForm()
})

/** 弹窗每次打开都从当前记录重新初始化，关闭后不会残留上一次草稿。 */
function resetForm() {
  const record = props.record
  const translatedDefaultContent = $t('Announcement.editor.defaultContent')
  const defaultContent = record?.content || translatedDefaultContent
  const i18n = mergeLegacyAnnouncementI18n(record?.i18nMessages, {
    title: record?.legacyTitle,
    summary: record?.legacySummary,
    content: record?.legacyContent === translatedDefaultContent ? undefined : record?.legacyContent,
  })

  form.title = record?.title || ''
  form.summary = record?.summary || ''
  form.content = defaultContent
  initialTitle = form.title
  initialSummary = form.summary
  form.type = record?.type.value || props.typeOptions[0]?.value || ''
  form.userIds = [...(record?.userIds || [])]
  form.organizationIds = [...(record?.organizationIds || [])]

  form.i18nMessages = i18n
}

function openI18n(field: AnnouncementI18nField) {
  currentI18nField.value = field
  i18nDialogVisible.value = true
}

function saveI18nMessages(messages: Record<string, string>) {
  form.i18nMessages = {
    ...(form.i18nMessages ?? {}),
    [currentI18nField.value]: messages,
  }
}

function handleUserChange(value: unknown) {
  const userIds = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
  form.userIds = userIds
  emit('selected-users-change', userIds)
}

/** 将编辑器内容按保存草稿或立即发布意图提交给页面容器。 */
function submit(publish: boolean) {
  if (!canSubmit.value) return
  const type = props.typeOptions.find(item => item.value === form.type) || props.record?.type
  if (!type) return
  let i18n = normalizeAnnouncementI18n(form.i18nMessages)
  if (form.title.trim() !== initialTitle) {
    i18n = updateAnnouncementLocaleText(i18n, 'title', currentLanguage.value, form.title)
  }
  if (form.summary.trim() !== initialSummary) {
    i18n = updateAnnouncementLocaleText(i18n, 'summary', currentLanguage.value, form.summary)
  }
  if (!props.record && form.content.trim() && !Object.keys(i18n.content ?? {}).length) {
    i18n = updateAnnouncementLocaleText(i18n, 'content', currentLanguage.value, form.content)
  }
  emit('save', {
    id: props.record?.id,
    title: form.title.trim(),
    summary: form.summary.trim() || undefined,
    content: form.content.trim(),
    type,
    userIds: [...form.userIds],
    organizationIds: [...form.organizationIds],
    publish,
    i18nMessages: i18n,
  })
}
</script>

<style scoped lang="less">
.announcement-i18n-textarea-field {
  position: relative;
}

.announcement-i18n-textarea-field__trigger {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  z-index: 1;
}

.announcement-i18n-textarea-field :deep(textarea.ant-input) {
  padding-right: var(--space-8);
}

.announcement-summary-input.ant-input-textarea-show-count {
  position: relative;

  &::after {
    position: absolute;
    inset-inline-end: var(--space-3);
    inset-block-end: var(--space-2);
    float: none;
    line-height: 1;
  }

  :deep(textarea.ant-input) {
    padding-bottom: 2rem;
  }
}
</style>
