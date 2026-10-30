<template>
  <div v-if="capabilities.loading.value" class="private-overview-loading"><a-spin /></div>
  <a-result v-else-if="capabilities.errors.value.length" status="error" :title="t('privateOverview.loadError')">
    <template #extra><a-button @click="capabilities.reload">{{ t('privateOverview.retry') }}</a-button></template>
  </a-result>
  <div v-else class="private-overview-layout">
    <PrivateKpis v-if="hasResources" :rows="resources.data?.kpis || []" :loading="resources.loading && !resources.data"
      :can-open="navigation.canOpen" @navigate="navigation.open" @retry="resources.refresh" />
    <div v-if="showAccess || access.applications" class="private-overview-top" :class="{ 'has-sidebar': showAccess && access.applications }">
        <PrivateAccess v-if="showAccess" :guide="guide.data" :actions="actions"
          :state="{ loading: guide.loading && !guide.data, error: guide.error }" :can-open="navigation.canOpen"
          @navigate="navigation.open" @retry="guide.refresh" />
        <ProjectHomeApplications v-if="access.applications" class="private-overview-applications" :info="applicationInfo" />
    </div>
    <div class="private-overview-grid" :class="{ 'has-sidebar': hasAlarms && (metrics.length || access.iot || access.video || access.runtime) }">
      <div v-if="metrics.length || access.iot || access.video || access.runtime" class="private-overview-main">
        <PrivateTrend v-if="metrics.length" :data="trend.data" :loading="trend.loading && !trend.data" :error="trend.error"
          :metric="metric" :range="range" :metrics="metrics" :option="charts.trendOption.value" :target="targets[metric]"
          :can-open="navigation.canOpen" @navigate="navigation.open" @retry="trend.refresh" @metric="metric = $event" @range="range = $event" />
        <div v-if="access.iot || access.video || access.runtime" class="private-overview-bottom">
          <PrivateAssets v-if="access.iot || access.video" :groups="resources.data?.assets || []"
            :state="{ loading: resources.loading && !resources.data, error: resources.error }" :can-open="navigation.canOpen"
            @navigate="navigation.open" @retry="resources.refresh" />
          <PrivateMonitor v-if="access.runtime" :rows="monitor.rows.value" :loading="monitor.loading.value && !monitor.rows.value.length"
            :error="monitor.error.value" :version="monitor.version" :target="targets.runtime" :can-open="navigation.canOpen"
            @navigate="navigation.open" @retry="monitor.refresh" />
        </div>
      </div>
        <PrivateAlarms v-if="hasAlarms" :data="alarms.data" :state="{ loading: alarms.loading && !alarms.data, error: alarms.error }"
          :can-open="navigation.canOpen" @navigate="navigation.open" @retry="alarms.refresh">
          <template #trend><div class="private-alarm-chart"><Echarts :option="charts.alarmOption.value" :library="[BarChart, GridComponent, TooltipComponent]" /></div></template>
        </PrivateAlarms>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import Echarts from '@jetlinks-web-core/components/Echarts'
import ProjectHomeApplications from '../../../visDashboard/Base/Applications/ProjectHomeApplications.vue'
import PrivateKpis from '../../../visDashboard/Base/Private/components/PrivateKpis.vue'
import PrivateAccess from '../../../visDashboard/Base/Private/components/PrivateAccess.vue'
import PrivateAssets from '../../../visDashboard/Base/Private/components/PrivateAssets.vue'
import PrivateMonitor from '../../../visDashboard/Base/Private/components/PrivateMonitor.vue'
import PrivateTrend from '../../../visDashboard/Base/Private/components/PrivateTrend.vue'
import PrivateAlarms from '../../../visDashboard/Base/Private/components/PrivateAlarms.vue'
import { usePrivateOverview } from '../../../visDashboard/Base/Private/usePrivateOverview'

const { t } = useI18n()
const { capabilities, access, hasResources, hasAlarms, metrics, metric, range,
  resources, guide, alarms, trend, monitor, charts, actions, showAccess, applicationInfo, navigation, targets } = usePrivateOverview()
</script>
<style scoped lang="less">
.private-overview-loading { min-height: 400px; display: grid; place-items: center; }
.private-overview-layout { container-type: inline-size; display: flex; flex-direction: column; gap: 16px; }
.private-overview-top, .private-overview-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; align-items: stretch; }
.private-overview-top.has-sidebar, .private-overview-grid.has-sidebar { grid-template-columns: minmax(0, 1fr) 340px; }
.private-overview-main { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.private-overview-bottom { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; min-width: 0; }
.private-overview-bottom > :only-child { grid-column: 1 / -1; }
.private-overview-applications { min-height: 172px; }
/* 私有化应用沿用共享组件，仅在概览页统一卡片边距。 */
.private-overview-layout :deep(.project-home-shell--private .ant-card-head) { min-height: 56px; padding: 16px 16px 8px; }
.private-overview-layout :deep(.project-home-shell--private .ant-card-head-title),
.private-overview-layout :deep(.project-home-shell--private .ant-card-extra) { padding-block: 0; }
.private-overview-layout :deep(.project-home-shell--private .ant-card-body) { padding: 16px !important; }
.private-alarm-chart { height: 92px; }
@container (max-width: 1199px) {
  .private-overview-top.has-sidebar, .private-overview-grid.has-sidebar { grid-template-columns: minmax(0, 1fr) 300px; }
  .private-overview-bottom { grid-template-columns: minmax(0, 1fr); }
}
@container (max-width: 899px) {
  .private-overview-top.has-sidebar, .private-overview-grid.has-sidebar { grid-template-columns: minmax(0, 1fr); }
}
</style>
