<template>
  <a-spin :spinning="loading">
    <div class="announcement-notification-scroll">
      <a-empty
        v-if="unavailable"
        :description="$t('Announcement.notification.unavailable')"
      />
      <article v-else-if="detail" class="announcement-notification-detail">
        <div v-if="detail.deployTime" class="announcement-notification-detail__meta">
          <AIcon type="ClockCircleOutlined" />
          {{ dayjs(detail.deployTime).format('YYYY-MM-DD HH:mm:ss') }}
        </div>
        <MarkdownEditor
          :model-value="detail.content"
          :rows="14"
          readonly
          :show-upload-file-toolbar="false"
        />
      </article>
    </div>
  </a-spin>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import dayjs from 'dayjs'
import MarkdownEditor from '@jetlinks-web-core/components/MarkdownEditor'
import {
  getSystemBulletinNotificationDetail,
  resolveSystemBulletinReference,
  type SystemBulletinNotificationDetail,
} from '../api'

const props = defineProps<{ data: Record<string, any> }>()
const detail = ref<SystemBulletinNotificationDetail>()
const loading = ref(false)
const unavailable = ref(false)
let requestSequence = 0

/** 同一详情壳连续切换通知时，只允许最新请求更新正文。 */
async function loadDetail() {
  const sequence = ++requestSequence
  detail.value = undefined
  loading.value = false
  unavailable.value = false
  const reference = resolveSystemBulletinReference(props.data)
  if (!reference) {
    unavailable.value = true
    return
  }
  loading.value = true
  try {
    const response = await getSystemBulletinNotificationDetail(reference)
    if (sequence === requestSequence) detail.value = response
  } catch {
    if (sequence === requestSequence) unavailable.value = true
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

watch(() => props.data, loadDetail, { immediate: true })
</script>

<style scoped lang="less">
.announcement-notification-scroll {
  max-height: min(70vh, 48rem);
  max-height: min(70dvh, 48rem);
  overflow-y: auto;
  overscroll-behavior: contain;
}

:global(.announcement-notification-modal .ant-modal-confirm-content) {
  max-width: 100% !important;
}

.announcement-notification-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);

  &__meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: var(--jet-theme-text-disabled);
    font-size: var(--fs-12);
  }
}
</style>
