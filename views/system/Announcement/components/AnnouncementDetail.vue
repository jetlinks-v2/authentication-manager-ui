<template>
  <div class="announcement-detail-scroll">
    <a-descriptions bordered :column="2" size="small">
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
          :text="item.stateText"
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

    <a-tabs v-model:activeKey="viewLocale" size="small">
      <a-tab-pane
        v-for="item in languagePanes"
        :key="item.value"
        :tab="item.label"
      >
        <div class="announcement-detail-pane">
          <a-alert
            v-if="item.missing"
            type="info"
            show-icon
            :message="$t('Announcement.detail.languageMissing', { language: item.label })"
          />
          <div v-if="item.summary" class="announcement-detail-summary">
            <span class="announcement-detail-summary__label">{{ $t('Announcement.detail.summary') }}</span>
            <span>{{ item.summary }}</span>
          </div>
          <MarkdownEditor
            :model-value="item.content"
            :rows="18"
            readonly
            :show-upload-file-toolbar="false"
          />
        </div>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import MarkdownEditor from '@jetlinks-web-core/components/MarkdownEditor'
import type { AnnouncementRecord } from '../types'
import {
  getAnnouncementI18n,
  resolveAnnouncementText,
  resolveAnnouncementStateLabel,
  resolveLocalizedText,
} from '../announcementI18n'

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

/** 每个语言一个标签页；该语言整条未填写时在页内显式提示，避免看起来“切换无效”。 */
const languagePanes = computed(() => {
  const i18n = getAnnouncementI18n(props.record?.i18nMessages)
  return [
    { value: 'zh', label: $t('Announcement.i18n.chinese') },
    { value: 'en', label: $t('Announcement.i18n.english') },
  ].map(item => ({
    ...item,
    summary: resolveAnnouncementText(props.record, 'summary', item.value),
    content: resolveAnnouncementText(props.record, 'content', item.value),
    // 状态文案按所选语言翻译，后端 stateText 仅作兜底，避免切到英文仍显示中文。
    stateText: resolveAnnouncementStateLabel(props.record?.state, item.value)
      || props.record?.stateText
      || '',
    missing: !['title', 'summary', 'content'].some(field =>
      resolveLocalizedText(i18n[field as keyof typeof i18n], item.value)),
  }))
})

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

.announcement-detail-pane {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.announcement-detail-summary {
  display: flex;
  gap: var(--space-2);
  font-size: var(--fs-13);
}

.announcement-detail-summary__label {
  flex: none;
  color: var(--jet-theme-text-secondary);
}
</style>
