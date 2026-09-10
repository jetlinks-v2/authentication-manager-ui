<template>
  <a-modal :open="!!alarm" :title="title" :width="620" centered :body-style="{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }" :confirm-loading="submitting"
    :ok-text="t('packages.ProjectHome.alarmConfirm')" :cancel-text="t('packages.ProjectHome.alarmCancel')"
    :ok-button-props="{ disabled: loading || failed || alarm?.state !== 'warning' || !describe.trim() || submitting }"
    :cancel-button-props="{ disabled: submitting }" :closable="!submitting" :keyboard="!submitting"
    :mask-closable="false" destroy-on-close @cancel="$emit('close')" @ok="$emit('submit', describe)">
    <a-spin :spinning="loading">
      <template v-if="alarm">
        <h3>{{ alarm.title || '—' }} <a-tag :color="alarm.state === 'warning' ? 'error' : 'success'">{{ alarm.stateText || (alarm.state === 'warning' ? t('packages.ProjectHome.alarmPending') : alarm.state === 'normal' ? t('packages.ProjectHome.alarmResolved') : '—') }}</a-tag></h3>
        <a-alert v-if="failed" type="error" :message="t('packages.ProjectHome.alarmDetailError')" show-icon>
          <template #action><a-button size="small" @click="$emit('retry')">{{ t('packages.ProjectHome.alarmRetry') }}</a-button></template>
        </a-alert>
        <VisionAlarmContent v-else-if="category === 'visionAlarm'" :alarm="alarm" />
        <a-descriptions v-else :column="1" size="small" class="alarm-facts">
          <a-descriptions-item :label="t('packages.ProjectHome.alarmObject')">{{ alarm.object || '—' }}</a-descriptions-item>
          <a-descriptions-item :label="t('packages.ProjectHome.alarmRule')">{{ alarm.rule || '—' }}</a-descriptions-item>
          <a-descriptions-item :label="t('packages.ProjectHome.alarmActual')">{{ alarm.actual || alarm.stateText || '—' }}</a-descriptions-item>
          <a-descriptions-item :label="t('packages.ProjectHome.alarmTime')">{{ alarm.time }}</a-descriptions-item>
        </a-descriptions>
        <a-form layout="vertical" class="alarm-form">
          <a-form-item :label="t('packages.ProjectHome.alarmDescription')" required>
            <a-textarea v-model:value="describe" :rows="4" :maxlength="200" show-count
              :disabled="submitting || loading || failed || alarm.state !== 'warning'"
              :placeholder="t(category === 'visionAlarm' ? 'packages.ProjectHome.visionAlarmDescriptionHint' : 'packages.ProjectHome.alarmDescriptionHint')" />
          </a-form-item>
        </a-form>
        <a-alert v-if="submitError" type="error" show-icon :message="t('packages.ProjectHome.alarmSubmitError')" />
      </template>
    </a-spin>
  </a-modal>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import VisionAlarmContent from './VisionAlarmContent.vue'
import type { AlarmCategory, QuickAlarm } from '../alarmService'
const props = defineProps<{
  category: AlarmCategory; alarm?: QuickAlarm; title: string; loading: boolean; failed: boolean; submitting: boolean; submitError: boolean
}>()
defineEmits<{ close: []; retry: []; submit: [description: string] }>()
const { t } = useI18n()
const describe = ref('')
// 切换记录清空草稿，同一记录查询重试或提交失败保留输入。
watch(() => props.alarm?.id, () => { describe.value = '' })
</script>
<style scoped>
.alarm-form { margin-top: 24px; }
h3 { overflow-wrap: anywhere; }
.alarm-facts { padding: 16px; background: var(--ant-color-fill-quaternary, #f6f7f9); border-radius: 8px; }
</style>
