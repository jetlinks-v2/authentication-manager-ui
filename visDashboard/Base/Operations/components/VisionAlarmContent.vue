<template>
  <div class="vision-alarm-content">
    <div class="vision-alarm-snapshot">
      <a-image v-if="alarm.imageUrl && !imageFailed" :src="alarm.imageUrl" :alt="alarm.title"
        :preview="false" width="100%" height="100%" @error="imageFailed = true" />
      <a-empty v-else :description="t(imageFailed ? 'packages.ProjectHome.alarmSnapshotError' : 'packages.ProjectHome.alarmNoSnapshot')" />
    </div>
    <a-alert :message="alarm.recognition || t('packages.ProjectHome.alarmNoRecognition')" type="warning" />
    <a-descriptions :column="1" size="small" class="vision-alarm-facts">
      <a-descriptions-item :label="t('packages.ProjectHome.alarmTime')">{{ alarm.time }}</a-descriptions-item>
      <a-descriptions-item :label="t('packages.ProjectHome.alarmLocation')">{{ alarm.location || '—' }}</a-descriptions-item>
    </a-descriptions>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { QuickAlarm } from '../alarmService'
const props = defineProps<{ alarm: QuickAlarm }>()
const { t } = useI18n()
const imageFailed = ref(false)
// 更换记录或详情补齐抓拍地址时，恢复图片加载状态。
watch(() => [props.alarm.id, props.alarm.imageUrl], () => { imageFailed.value = false })
</script>
<style scoped lang="less">
.vision-alarm-content { display: grid; gap: 14px; }
.vision-alarm-snapshot { aspect-ratio: 16 / 9; overflow: hidden; display: grid; place-items: center; border-radius: 8px; background: var(--ant-color-fill-quaternary, #f6f7f9); }
.vision-alarm-snapshot :deep(img) { object-fit: contain; }
.vision-alarm-facts { padding: 16px; border-radius: 8px; background: var(--ant-color-fill-quaternary, #f6f7f9); overflow-wrap: anywhere; }
</style>
