<template>
  <div class="announcement-detail-scroll">
    <div class="announcement-detail-toolbar">
      <span class="announcement-detail-toolbar__label">{{ $t('Announcement.detail.language') }}</span>
      <a-radio-group v-model:value="viewLocale" size="small">
        <a-radio-button value="zh">{{ $t('Announcement.i18n.chinese') }}</a-radio-button>
        <a-radio-button value="en">{{ $t('Announcement.i18n.english') }}</a-radio-button>
      </a-radio-group>
    </div>

    <a-descriptions bordered :column="2" size="small">
      <a-descriptions-item v-if="summaryText" :label="$t('Announcement.detail.summary')" :span="2">
        {{ summaryText }}
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
      :model-value="contentText"
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
import { resolveAnnouncementText } from '../announcementI18n'

const props = defineProps({
  record: { type: Object as PropType<AnnouncementRecord>, required: true },
  locale: { type: String, default: 'zh' },
})

const emit = defineEmits<{ (event: 'update:locale', locale: string): void }>()

const { t: $t } = useI18n()
const statusNames = { published: 'success', unpublished: 'default' }

/** 详情弹窗内可切换查看语言，便于发布前核对中英文内容。 */
const viewLocale = computed({
  get: () => props.locale,
  set: (value: string) => emit('update:locale', value),
})
const summaryText = computed(() => resolveAnnouncementText(props.record, 'summary', props.locale))
const contentText = computed(() => resolveAnnouncementText(props.record, 'content', props.locale))

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

.announcement-detail-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
}

.announcement-detail-toolbar__label {
  color: var(--jet-theme-text-secondary);
  font-size: var(--fs-13);
}
</style>
