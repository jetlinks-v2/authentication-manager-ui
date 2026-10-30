<template>
  <div class="announcement-detail-scroll">
    <a-tabs v-model:activeKey="viewLocale">
      <a-tab-pane
        v-for="item in languagePanes"
        :key="item.value"
        :tab="item.label"
      >
        <a-alert
          v-if="item.fallback"
          type="info"
          show-icon
          :message="$t('Announcement.detail.languageMissing', { language: item.label })"
        />
        <MarkdownEditor
          :model-value="item.content"
          :rows="18"
          readonly
          :show-upload-file-toolbar="false"
        />
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
  resolveLocalizedText,
} from '../announcementI18n'

const props = defineProps({
  record: { type: Object as PropType<AnnouncementRecord>, required: true },
  locale: { type: String, default: 'zh' },
})
const emit = defineEmits<{
  (event: 'update:locale', value: string): void
}>()
const { t: $t } = useI18n()
const viewLocale = computed({
  get: () => props.locale,
  set: value => emit('update:locale', value),
})
const languagePanes = computed(() => {
  const i18n = getAnnouncementI18n(props.record.i18nMessages)
  return [
    { value: 'zh', label: $t('Announcement.i18n.chinese') },
    { value: 'en', label: $t('Announcement.i18n.english') },
  ].map(item => ({
    ...item,
    content: resolveAnnouncementText(props.record, 'content', item.value),
    fallback: !resolveLocalizedText(i18n.content, item.value),
  }))
})
</script>

<style scoped lang="less">
.announcement-detail-scroll {
  max-height: min(70dvh, 48rem);
  overflow-y: auto;
}

:deep(.ant-alert) {
  margin-bottom: var(--space-3);
}
</style>
