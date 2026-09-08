<template>
  <div class="announcement-detail-scroll">
    <a-descriptions bordered :column="2" size="small">
      <a-descriptions-item v-if="record.summary" :label="$t('Announcement.detail.summary')" :span="2">
        {{ record.summary }}
      </a-descriptions-item>
      <a-descriptions-item :label="$t('Announcement.detail.scope')">
        {{ audienceText }}
      </a-descriptions-item>
      <!-- 公告类型暂不展示，详情数据契约继续保留。 -->
      <!-- <a-descriptions-item :label="$t('Announcement.detail.type')">
        {{ record.type.text }}
      </a-descriptions-item> -->
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

    <MarkdownEditor
      :model-value="record.content"
      :rows="18"
      readonly
      :show-upload-file-toolbar="false"
    />
  </div>
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

<style scoped lang="less">
.announcement-detail-scroll {
  display: flex;
  max-height: min(70vh, 48rem);
  max-height: min(70dvh, 48rem);
  flex-direction: column;
  gap: var(--space-4);
  overflow-y: auto;
  overscroll-behavior: contain;
}
</style>
