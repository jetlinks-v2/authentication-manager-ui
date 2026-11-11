<template>
  <div class="private-overview-widget" :data-private-panel="panel.panel" :data-private-metric="panel.metricId">
    <PrivateKpis v-if="panel.panel === 'kpi'" :rows="rows" single :loading="resources.loading && !resources.data"
      :error="resources.error" :can-open="navigation.canOpen" @navigate="navigation.open" @retry="resources.refresh" />
    <RecentVisits v-else-if="panel.panel === 'recent'" variant="private" />
    <PrivateMyApplications v-else-if="panel.panel === 'my-applications'" :entries="onlyApplications.entries.value"
      :state="{ loading: onlyApplications.applicationsLoading.value, error: onlyApplications.applicationsError.value, openingId: onlyApplications.openingId.value }"
      :display="{ showAll: onlyApplications.canOpenAll.value }"
      @open="onlyApplications.openApplication" @retry="onlyApplications.retry" @all="onlyApplications.openAll" />
    <PrivateAccount v-else-if="panel.panel === 'account'" :profile="onlyApplications.profile.value"
      :entries="onlyApplications.applicationsError.value || onlyApplications.applicationsLoading.value ? [] : onlyApplications.entries.value" :opening-id="onlyApplications.openingId.value"
      @open="onlyApplications.openApplication" @account="onlyApplications.openAccount" />
    <PrivateAccess v-else-if="panel.panel === 'access'" :guide="guide.data" :actions="actions"
      :state="{ loading: guide.loading && !guide.data, error: guide.error }" :can-open="navigation.canOpen"
      @navigate="navigation.open" @retry="guide.refresh" />
    <ProjectHomeApplications v-else-if="panel.panel === 'applications'" :info="applicationInfo" />
    <PrivateTrend v-else-if="panel.panel === 'trend'" :data="trend.data" :loading="trend.loading && !trend.data" :error="trend.error"
      :metric="metric" :range="range" :metrics="metrics" :option="charts.trendOption.value" :target="targets[metric]"
      :can-open="navigation.canOpen" @navigate="navigation.open" @retry="trend.refresh" @metric="metric = $event" @range="range = $event" />
    <PrivateAssets v-else-if="panel.panel === 'assets'" :groups="resources.data?.assets || []"
      :state="{ loading: resources.loading && !resources.data, error: resources.error }" :can-open="navigation.canOpen"
      @navigate="navigation.open" @retry="resources.refresh" />
    <PrivateMonitor v-else-if="panel.panel === 'monitor'" :rows="monitor.rows.value" :loading="monitor.loading.value && !monitor.rows.value.length"
      :version="monitor.version"
      :error="monitor.error.value" :target="targets.runtime" :can-open="navigation.canOpen"
      @navigate="navigation.open" @retry="monitor.refresh" />
    <PrivateAlarms v-else-if="panel.panel === 'alarms'" :data="alarms.data" :state="{ loading: alarms.loading && !alarms.data, error: alarms.error }"
      :can-open="navigation.canOpen" @navigate="navigation.open" @retry="alarms.refresh">
      <template #trend><div class="private-alarm-chart"><Echarts :option="charts.alarmOption.value" :library="[BarChart, GridComponent, TooltipComponent]" /></div></template>
    </PrivateAlarms>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import type { DashboardWidget } from '@jetlinks-web-core/components/DashBoardCanvas'
import Echarts from '@jetlinks-web-core/components/Echarts'
import ProjectHomeApplications from '../../../../visDashboard/Base/Applications/ProjectHomeApplications.vue'
import RecentVisits from '../../../../visDashboard/Base/Saas/SaasRecent.vue'
import PrivateMyApplications from '../../../../visDashboard/Base/Private/components/PrivateMyApplications.vue'
import PrivateAccount from '../../../../visDashboard/Base/Private/components/PrivateAccount.vue'
import PrivateKpis from '../../../../visDashboard/Base/Private/components/PrivateKpis.vue'
import PrivateAccess from '../../../../visDashboard/Base/Private/components/PrivateAccess.vue'
import PrivateAssets from '../../../../visDashboard/Base/Private/components/PrivateAssets.vue'
import PrivateMonitor from '../../../../visDashboard/Base/Private/components/PrivateMonitor.vue'
import PrivateTrend from '../../../../visDashboard/Base/Private/components/PrivateTrend.vue'
import PrivateAlarms from '../../../../visDashboard/Base/Private/components/PrivateAlarms.vue'
import { usePrivateOverviewContext } from '../../../../visDashboard/Base/Private/usePrivateOverview'
import type { PrivateOverviewWidget } from './layout'

const props = defineProps<{ info: DashboardWidget }>()
const { metric, range, metrics, resources, guide, alarms, trend, monitor, charts, actions, onlyApplications,
  applicationInfo, navigation, targets } = usePrivateOverviewContext()
// 重排仅更新画布 info；数据与动作始终来自页面唯一的查询上下文。
const panel = computed(() => props.info.componentProps.privateOverview as Pick<PrivateOverviewWidget, 'panel' | 'metricId'>)
const rows = computed(() => resources.data?.kpis.filter(row => row.id === panel.value.metricId) || [])
</script>
<style scoped>
.private-overview-widget { width: 100%; height: 100%; min-width: 0; min-height: 0; }
.private-alarm-chart { height: 92px; }
</style>
