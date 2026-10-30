<template>
  <a-spin :spinning="loading">
    <section class="announcement-notification-shell">
      <header
        v-if="detail"
        class="announcement-notification-dialog-header"
      >
        <h2 class="announcement-notification-dialog-header__title">
          {{ detail.title }}
        </h2>
        <div class="announcement-notification-dialog-header__meta">
          <a-tag
            v-if="detail.typeText || detail.type"
            class="announcement-notification-dialog-header__type"
          >
            {{ detail.typeText || detail.type }}
          </a-tag>
          <span
            v-if="detail.deployTime"
            class="announcement-notification-dialog-header__time"
          >
            {{ dayjs(detail.deployTime).format('YYYY-MM-DD HH:mm:ss') }}
          </span>
        </div>
      </header>
      <div class="announcement-notification-scroll">
        <CloudEmpty
          v-if="unavailable"
          :description="$t('Announcement.notification.unavailable')"
        />
        <article v-else-if="detail" class="announcement-notification-detail">
          <div class="announcement-notification-detail__meta">
            <AIcon :type="typeIcon" />
            <a-tag v-if="detail.typeText || detail.type">{{ detail.typeText || detail.type }}</a-tag>
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
    </section>
  </a-spin>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { useI18n } from 'vue-i18n'
import MarkdownEditor from '@jetlinks-web-core/components/MarkdownEditor'
import {
  getSystemBulletinNotificationDetail,
  resolveSystemBulletinReference,
  type SystemBulletinNotificationDetail,
} from '../api'
import { resolveBulletinTypeIcon } from '../bulletinTypeIcon'

const props = defineProps<{ data: Record<string, any> }>()
const { locale } = useI18n()
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

watch([() => props.data, locale], loadDetail, { immediate: true })
</script>

<style scoped lang="less">
.announcement-notification-scroll {
  max-height: min(70vh, 48rem);
  max-height: min(70dvh, 48rem);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.announcement-notification-dialog-header {
  display: none;
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
    padding: 0;
    border-radius: var(--r-4) !important;
    background: var(--jet-theme-bg-container);
  }

  .ant-modal-body {
    padding: 0 !important;
  }

  .ant-modal-confirm-body-wrapper,
  .ant-modal-confirm-body {
    width: 100%;
  }

  .ant-modal-confirm-body {
    display: block;
  }

  .ant-modal-confirm-body .ant-modal-confirm-title {
    display: none;
  }

  .ant-modal-confirm-content {
    width: 100%;
    margin-block-start: 0 !important;
    padding: 0;
  }

  .announcement-notification-dialog-header {
    position: relative;
    display: block;
    min-height: 9rem;
    overflow: hidden;
    padding: var(--space-8) var(--space-10);
    background: linear-gradient(
      110deg,
      var(--jet-theme-primary),
      color-mix(in srgb, var(--jet-theme-primary) 55%, white)
    );
    color: white;

    &::before,
    &::after {
      position: absolute;
      border-radius: 50%;
      content: '';
      pointer-events: none;
    }

    &::before {
      top: -8rem;
      right: 7rem;
      width: 18rem;
      height: 18rem;
      border: 2px solid color-mix(in srgb, white 28%, transparent);
    }

    &::after {
      top: -3rem;
      right: 4rem;
      width: 9rem;
      height: 9rem;
      background: color-mix(in srgb, white 10%, transparent);
    }

    &__title,
    &__meta {
      position: relative;
      z-index: 1;
    }

    &__title {
      margin: 0 0 var(--space-4);
      color: inherit;
      font-size: var(--fs-24);
      font-weight: 700;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    &__time {
      color: color-mix(in srgb, white 82%, transparent);
      font-size: var(--fs-14);
    }

    &__meta {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    &__type.ant-tag {
      max-width: 12rem;
      overflow: hidden;
      margin-inline-end: 0;
      border-color: color-mix(in srgb, white 38%, transparent);
      border-radius: var(--r-pill);
      background: color-mix(in srgb, white 18%, transparent);
      color: white;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .announcement-notification-detail__meta {
    display: none;
  }

  .announcement-notification-scroll {
    box-sizing: border-box;
    max-height: min(55vh, 32rem);
    max-height: min(55dvh, 32rem);
    padding: var(--space-8) var(--space-10);
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
    display: flex;
    justify-content: center;
    margin-top: 0;
    padding: var(--space-4) var(--space-8) var(--space-6);
    background: var(--jet-theme-bg-container);
  }

  .ant-modal-confirm-btns .ant-btn {
    min-width: 12rem;
    height: 2.5rem;
    border-radius: var(--r-pill);
  }

  @media (max-width: 40rem) {
    .announcement-notification-dialog-header,
    .announcement-notification-scroll {
      padding-inline: var(--space-6);
    }

    .ant-modal-confirm-btns .ant-btn {
      width: 100%;
      min-width: 0;
    }
  }
}
</style>
