<template>
  <a-spin :spinning="loading">
    <div class="announcement-notification-scroll">
      <CloudEmpty
        v-if="unavailable"
        :description="$t('Announcement.notification.unavailable')"
      />
      <article v-else-if="detail" class="announcement-notification-detail">
        <div class="announcement-notification-detail__meta">
          <AIcon :type="typeIcon" />
          <span v-if="detail.deployTime">
            {{ dayjs(detail.deployTime).format('YYYY-MM-DD HH:mm:ss') }}
          </span>
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
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'
import MarkdownEditor from '@jetlinks-web-core/components/MarkdownEditor'
import {
  getSystemBulletinNotificationDetail,
  resolveSystemBulletinReference,
  type SystemBulletinNotificationDetail,
} from '../api'
import { resolveBulletinTypeIcon } from '../bulletinTypeIcon'

const props = defineProps<{ data: Record<string, any> }>()
const detail = ref<SystemBulletinNotificationDetail>()
const loading = ref(false)
const unavailable = ref(false)
const typeIcon = computed(() => resolveBulletinTypeIcon(detail.value?.type))
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

<style lang="less">
.announcement-notification-modal.ant-modal-confirm {
  .ant-modal-content {
    overflow: hidden;
    border-radius: 0.5rem !important;
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--jet-theme-primary) 29.4%, var(--jet-theme-bg-container)),
      var(--jet-theme-bg-container) 40%
    );
  }

  .ant-modal-body {
    padding: 0 !important;
  }

  .ant-modal-confirm-body .ant-modal-confirm-title {
    padding: var(--space-5) 4rem var(--space-5) var(--space-6);
    font-size: var(--fs-18);
    font-weight: 600;
    line-height: 1.6;
    overflow-wrap: anywhere;
  }

  .ant-modal-close {
    top: var(--space-5);
    inset-inline-end: var(--space-6);
    width: 2rem;
    height: 2rem;
    border-radius: var(--r-2);
    background: color-mix(in srgb, var(--jet-theme-bg-container) 80%, transparent);
    color: var(--jet-theme-text-secondary);
  }

  .ant-modal-confirm-content {
    width: 100%;
    margin-block-start: 0 !important;
    padding: var(--space-6);
  }

  .announcement-notification-detail__meta {
    display: none;
  }

  .announcement-notification-scroll {
    max-height: min(60vh, calc(100vh - 13rem));
    max-height: min(60dvh, calc(100dvh - 13rem));
  }

  .announcement-notification-detail .j-md-editor__surface {
    border: 0;
    border-radius: 0;
    background: transparent;
  }

  .announcement-notification-detail .j-md-editor__preview-only {
    min-height: 0;
    padding: 0;
    background: transparent;
  }

  .ant-modal-confirm-btns {
    margin-top: 0;
    padding: var(--space-3) var(--space-6);
    border-top: 1px solid var(--jet-theme-border-secondary);
  }

  .ant-modal-confirm-btns .ant-btn {
    min-width: 5rem;
    border-radius: var(--r-2);
  }
}
</style>
