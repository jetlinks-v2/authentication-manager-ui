<template>
  <a-spin :spinning="loading">
    <a-empty
      v-if="unavailable"
      :description="$t('Announcement.notification.unavailable')"
    />
    <template v-else-if="detail">
      <a-descriptions bordered :column="2" size="small">
        <a-descriptions-item :label="$t('Announcement.detail.title')" :span="2">
          {{ detail.title }}
        </a-descriptions-item>
        <a-descriptions-item v-if="detail.type?.text" :label="$t('Announcement.detail.type')">
          {{ detail.type.text }}
        </a-descriptions-item>
        <a-descriptions-item v-if="detail.deployTime" :label="$t('Announcement.detail.publishTime')">
          {{ dayjs(detail.deployTime).format('YYYY-MM-DD HH:mm:ss') }}
        </a-descriptions-item>
      </a-descriptions>
      <a-divider orientation="left">{{ $t('Announcement.detail.content') }}</a-divider>
      <MarkdownEditor
        :model-value="detail.content"
        :rows="14"
        readonly
        :show-upload-file-toolbar="false"
      />
    </template>
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
