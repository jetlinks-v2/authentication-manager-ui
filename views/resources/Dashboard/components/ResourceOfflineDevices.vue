<template>
  <section class="resource-offline-devices" data-resource-section="offline" :aria-label="title">
    <header class="resource-offline-devices__header">
      <h3>{{ title }}</h3>
      <div class="resource-offline-devices__actions">
        <span v-if="!loading && !error" class="resource-offline-devices__muted">{{ summary }}</span>
        <a-button v-if="canOpen" type="link" size="small" class="action-link" @click="open">
          {{ linkText }}<RightOutlined class="action-arrow" />
        </a-button>
      </div>
    </header>
    <div v-if="loading" class="resource-offline-devices__state"><a-spin /></div>
    <ResourceEmpty v-else-if="error" class="resource-offline-devices__state" :title="t('resourceDashboard.loadError')">
      <a-button size="small" @click="refresh">{{ t('resourceDashboard.retry') }}</a-button>
    </ResourceEmpty>
    <ResourceEmpty v-else-if="empty" class="resource-offline-devices__state" :title="emptyTitle" />
    <div v-else class="resource-offline-devices__list">
      <div v-for="device in devices" :key="device.id" class="resource-offline-devices__row">
        <a-badge status="error" />
        <div class="resource-offline-devices__identity">
          <span :title="device.name">{{ device.name }}</span>
          <span v-if="device.description" class="resource-offline-devices__muted" :title="device.description">{{ device.description }}</span>
        </div>
        <span class="resource-offline-devices__muted resource-offline-devices__time" :title="device.fullTime">{{ device.offlineText }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { RightOutlined } from '@ant-design/icons-vue'
import ResourceEmpty from '../../../../visDashboard/ResourceCenter/components/ResourceEmpty.vue'
import { useResourceSupplemental } from '../useResourceSupplemental'
import type { ResourceDeviceScope } from '../services/resourceDeviceScope'

const props = defineProps<{ scope: string; deviceScope?: ResourceDeviceScope }>()
const { t } = useI18n()
// 列表保持独立请求和重试，地图加载失败不影响当前分类的离线设备查询。
const { title, emptyTitle, loading, error, empty, summary, devices, canOpen, linkText, open, refresh } = useResourceSupplemental(
  ref('offline' as const), ref(true), toRef(props, 'scope'), toRef(props, 'deviceScope'),
)
</script>

<style scoped>
.resource-offline-devices { min-width: 0; min-height: 0; display: flex; flex-direction: column; padding: 8px 16px; }
.resource-offline-devices__header { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 16px; padding-bottom: 12px; border-bottom: 1px solid var(--ant-color-border-secondary, #f0f0f0); }
.resource-offline-devices__header h3 { margin: 0; color: var(--ant-color-text, #17243b); font-size: 14px; font-weight: 600; }
.resource-offline-devices__actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-left: auto; }
.resource-offline-devices__muted { color: var(--ant-color-text-secondary, #8c8c8c); font-size: 12px; }
.resource-offline-devices__state { display: flex; flex: 1; min-height: 0; align-items: center; justify-content: center; }
.resource-offline-devices__list { flex: 1; min-height: 0; overflow: auto; }
.resource-offline-devices__row { display: flex; align-items: center; gap: 10px; padding: 12px 0; border-bottom: 1px solid var(--ant-color-border-secondary, #f0f0f0); }
.resource-offline-devices__row:last-child { border-bottom: 0; }
.resource-offline-devices__identity { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.resource-offline-devices__identity > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.resource-offline-devices__time { flex: none; font-variant-numeric: tabular-nums; }
</style>
