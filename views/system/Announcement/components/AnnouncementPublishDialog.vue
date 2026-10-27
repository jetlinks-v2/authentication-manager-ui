<template>
  <a-modal
    :open="open"
    :title="$t('Announcement.editor.publishTitle')"
    :width="640"
    :mask-closable="false"
    :closable="!loading"
    @cancel="!loading && $emit('update:open', false)"
  >
    <a-form layout="vertical">
      <a-form-item :label="$t('Announcement.detail.title')">
        {{ record?.title }}
      </a-form-item>
      <a-form-item :label="$t('Announcement.editor.users')">
        <a-select
          v-model:value="audience.userIds"
          mode="multiple"
          show-search
          allow-clear
          :disabled="loading"
          :filter-option="false"
          :loading="userLoading"
          :max-tag-count="2"
          :options="userOptions"
          :placeholder="$t('Announcement.editor.usersPlaceholder')"
          :get-popup-container="getPopupContainer"
          @change="$emit('selected-users-change', audience.userIds)"
          @search="$emit('search-users', $event)"
        />
      </a-form-item>
      <a-form-item :label="$t('Announcement.editor.organizations')">
        <form-item-org
          v-model:value="audience.organizationIds"
          :show-add="false"
          :extra-props="{
            multiple: true,
            allowClear: true,
            disabled: loading,
            maxTagCount: 2,
            placeholder: $t('Announcement.editor.organizationsPlaceholder'),
            getPopupContainer,
          }"
        />
      </a-form-item>
      <a-alert type="info" show-icon :message="$t('Announcement.editor.audienceHint')" />
    </a-form>
    <template #footer>
      <a-button :disabled="loading" @click="$emit('update:open', false)">
        {{ $t('Announcement.action.cancel') }}
      </a-button>
      <j-permission-button
        has-permission="system/Announcement:publish"
        type="primary"
        :loading="loading"
        :disabled="loading"
        @click="submit"
      >
        {{ $t('Announcement.action.confirmPublish') }}
      </j-permission-button>
    </template>
  </a-modal>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AnnouncementAudience, AnnouncementRecord, AnnouncementUserOption } from '../types'

const props = defineProps({
  open: { type: Boolean, default: false },
  record: { type: Object as PropType<AnnouncementRecord>, default: undefined },
  loading: { type: Boolean, default: false },
  userOptions: { type: Array as PropType<AnnouncementUserOption[]>, default: () => [] },
  userLoading: { type: Boolean, default: false },
})
const emit = defineEmits<{
  (event: 'update:open', open: boolean): void
  (event: 'publish', audience: AnnouncementAudience): void
  (event: 'search-users', keyword: string): void
  (event: 'selected-users-change', userIds: string[]): void
}>()
const { t: $t } = useI18n()
const audience = reactive<AnnouncementAudience>({ userIds: [], organizationIds: [] })

// 打开一次就是新的发布意图，关闭或撤回后的旧选择不能隐式进入下一批次。
watch(() => props.open, (open) => {
  if (open) {
    audience.userIds = []
    audience.organizationIds = []
  }
})

function getPopupContainer(triggerNode: HTMLElement) {
  return triggerNode.parentElement || document.body
}

function submit() {
  if (props.loading) return
  emit('publish', {
    userIds: [...audience.userIds],
    organizationIds: [...audience.organizationIds],
  })
}
</script>
