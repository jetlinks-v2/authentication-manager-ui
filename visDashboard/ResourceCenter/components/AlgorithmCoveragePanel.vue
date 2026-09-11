<template>
  <ResourceEmpty
    v-if="!items.length || isAllZero"
    icon="EyeOutlined"
    :title="t('resourceDashboard.noVideoDevices')"
    :description="t('resourceDashboard.noVideoDevicesAlgoDesc')"
    :action-text="t('resourceDashboard.actionAddVideoDevice')"
    @action="handleAddVideoDevice"
  />
  <div v-else class="algo-coverage-panel">
    <div v-for="item in items" :key="item.id" class="algo-row" :class="{ unconfigured: item.unconfigured }">
      <span class="algo-name" :title="item.title || item.name">{{ item.name }}</span>
      <div class="algo-bar-track">
        <div
          class="algo-bar-fill"
          :class="{ unconfigured: item.unconfigured }"
          :style="{ width: `${maximum > 0 ? Math.min(100, Math.round((item.value / maximum) * 100)) : 0}%` }"
        />
      </div>
      <span class="algo-count" :class="{ unconfigured: item.unconfigured }">
        {{ item.value }} <small>{{ t('resourceDashboard.unit') }}</small>
      </span>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { useI18n } from 'vue-i18n'
import type { AlgorithmCoverageItem } from '../shared'
import ResourceEmpty from './ResourceEmpty.vue'

const props = defineProps<{ items: AlgorithmCoverageItem[] }>()
const { t } = useI18n()
const menuStore = useMenuStore()

const isAllZero = computed(() => !props.items.length || props.items.every(item => item.value === 0))

function handleAddVideoDevice() {
  const target = menuStore.getMenu('media/Device') ? 'media/Device' : 'media/Device/Save'
  if (menuStore.getMenu(target)) {
    menuStore.jumpPage(target, { query: { type: 'video', action: 'create' } })
  }
}

const maximum = computed(() => Math.max(1, ...props.items.map(item => item.value)))
</script>
<style scoped>
.algo-coverage-panel {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 8px;
  height: 100%;
  min-height: 0;
  padding: 4px 0;
  overflow-y: auto;
}
.algo-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  line-height: 14px;
}
.algo-name {
  width: 76px;
  flex-shrink: 0;
  color: #4b5563;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.algo-bar-track {
  flex: 1;
  min-width: 0;
  height: 6px;
  background: #f3f4f7;
  border-radius: 3px;
  overflow: hidden;
}
.algo-bar-fill {
  height: 100%;
  background: #2b77ff;
  border-radius: 3px;
  transition: width 0.3s ease;
}
.algo-bar-fill.unconfigured {
  background: #ff4d4f;
}
.algo-count {
  width: 44px;
  flex-shrink: 0;
  text-align: right;
  color: #4b5563;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.algo-count small {
  color: #8c8c8c;
  margin-left: 2px;
}
.algo-count.unconfigured {
  color: #ff4d4f;
}
.algo-count.unconfigured small {
  color: #ff4d4f;
}
</style>
