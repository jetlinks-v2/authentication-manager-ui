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
        />
      </a-form-item>

      <a-form-item :label="$t('Announcement.editor.type')" required>
        <a-select
          v-model:value="form.type"
          :loading="typeLoading"
          :options="typeOptions"
          :field-names="{ label: 'text', value: 'value' }"
          :placeholder="$t('Announcement.editor.typePlaceholder')"
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
              }"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item :label="$t('Announcement.editor.content')" required>
        <MarkdownEditor
          v-model="form.content"
          :rows="14"
          :placeholder="$t('Announcement.editor.contentPlaceholder')"
          :show-upload-file-toolbar="false"
        />
      </a-form-item>
    </a-form>

    <template #footer>
      <a-button :disabled="loading" @click="$emit('update:open', false)">{{ $t('Announcement.action.cancel') }}</a-button>
      <j-permission-button
        v-if="!publishMode"
        :has-permission="record ? 'system/Announcement:edit' : 'system/Announcement:add'"
        :loading="loading"
        :disabled="!canSubmit"
        @click="submit(false)"
      >
        {{ $t('Announcement.action.saveDraft') }}
      </j-permission-button>
      <j-permission-button
        has-permission="system/Announcement:publish"
        type="primary"
        :loading="loading"
        :disabled="!canSubmit"
        @click="submit(true)"
      >
        {{ $t(publishMode ? 'Announcement.action.confirmPublish' : 'Announcement.action.savePublish') }}
      </j-permission-button>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import MarkdownEditor from '@jetlinks-web-core/components/MarkdownEditor'
import type {
  AnnouncementDraft,
  AnnouncementRecord,
  AnnouncementType,
  AnnouncementUserOption,
} from '../types'

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

const { t: $t } = useI18n()
const form = reactive({
  title: '',
  content: '',
  type: '',
  userIds: [] as string[],
  organizationIds: [] as string[],
})

const dialogTitle = computed(() => {
  if (props.publishMode) return $t('Announcement.editor.publishTitle')
  return props.record ? $t('Announcement.editor.editTitle') : $t('Announcement.editor.createTitle')
})

const canSubmit = computed(() => Boolean(
  form.title.trim()
  && form.content.trim()
  && form.type,
))

watch(() => props.open, (open) => {
  if (open) resetForm()
})

/** 弹窗每次打开都从当前记录重新初始化，关闭后不会残留上一次草稿。 */
function resetForm() {
  const record = props.record
  form.title = record?.title || ''
  form.content = record?.content || $t('Announcement.editor.defaultContent')
  form.type = record?.type.value || props.typeOptions[0]?.value || ''
  form.userIds = [...(record?.userIds || [])]
  form.organizationIds = [...(record?.organizationIds || [])]
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
  emit('save', {
    id: props.record?.id,
    title: form.title.trim(),
    content: form.content.trim(),
    type,
    userIds: [...form.userIds],
    organizationIds: [...form.organizationIds],
    publish,
  })
}
</script>
