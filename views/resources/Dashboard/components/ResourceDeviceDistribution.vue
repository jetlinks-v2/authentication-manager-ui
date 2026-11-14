<template>
  <a-card class="resource-panel resource-device-distribution" :title="t('resourceDashboard.DeviceDistribution')">
    <div class="resource-device-distribution__content">
      <div class="resource-device-distribution__map" data-resource-section="map">
        <ResourceDeviceMap />
      </div>
      <ResourceOfflineDevices :scope="runtime.scope.value" :device-scope="runtime.deviceScope.value" />
    </div>
  </a-card>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ResourceDeviceMap from './ResourceDeviceMap.vue'
import ResourceOfflineDevices from './ResourceOfflineDevices.vue'
import { useResourcePageContext } from '../resourcePageContext'

const { t } = useI18n()
const runtime = useResourcePageContext()
</script>

<style scoped>
.resource-device-distribution { container: device-distribution / inline-size; }
.resource-device-distribution__content { display: grid; grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr); height: 100%; min-height: 0; }
.resource-device-distribution__map { min-width: 0; min-height: 0; padding: 12px 16px 16px; border-right: 1px solid var(--ant-color-border-secondary, #f0f0f0); }
@container device-distribution (max-width: 760px) {
  .resource-device-distribution__content { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(280px, 1fr) minmax(240px, 1fr); }
  .resource-device-distribution__map { border-right: 0; border-bottom: 1px solid var(--ant-color-border-secondary, #f0f0f0); }
}
</style>
