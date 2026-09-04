<template>
  <a-descriptions bordered :column="2" size="small">
    <a-descriptions-item :label="$t('Announcement.detail.title')" :span="2">
      {{ record.title }}
    </a-descriptions-item>
    <a-descriptions-item :label="$t('Announcement.detail.scope')">
      {{ audienceText }}
    </a-descriptions-item>
    <a-descriptions-item :label="$t('Announcement.detail.type')">
      {{ record.type.text }}
    </a-descriptions-item>
    <a-descriptions-item :label="$t('Announcement.detail.state')">
      <j-badge-status
        :status="record.state"
        :text="record.stateText || $t(`Announcement.status.${record.state}`)"
        :status-names="statusNames"
      />
    </a-descriptions-item>
    <a-descriptions-item :label="$t('Announcement.detail.creator')">
      {{ record.creatorName }}
    </a-descriptions-item>
    <a-descriptions-item :label="$t('Announcement.detail.publishTime')">
      {{ record.deployTime || record.modifyTime }}
    </a-descriptions-item>
  </a-descriptions>

  <a-divider orientation="left">{{ $t('Announcement.detail.content') }}</a-divider>
  <MarkdownEditor
    :model-value="record.content"
    :rows="18"
    readonly
    :show-upload-file-toolbar="false"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import MarkdownEditor from '@jetlinks-web-core/components/MarkdownEditor'
import type { AnnouncementRecord } from '../types'

const props = defineProps({
  record: { type: Object as PropType<AnnouncementRecord>, required: true },
})

const { t: $t } = useI18n()
const statusNames = { published: 'success', unpublished: 'default' }
const audienceText = computed(() => {
  const userCount = props.record.userIds?.length || 0
  const organizationCount = props.record.organizationIds?.length || 0
  if (!userCount && !organizationCount) return $t('Announcement.scope.platform')
  return $t('Announcement.scope.selected', { userCount, organizationCount })
})
</script>
