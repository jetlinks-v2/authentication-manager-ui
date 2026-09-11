<template>
  <div class="home-content home-resources" :class="{
    'home-resources--metrics': chart.displayStyle === 'metrics',
    'home-resources--asymmetric': isAsymmetricAccess,
  }">
    <template v-if="chart.displayStyle === 'default'">
      <section v-for="group in groups" :key="group" class="home-resource-group" :class="{ 'home-resource-group--wide': group === 'intelligence' }">
        <h4 class="resource-group-title"><span v-if="chart.showIcon" class="resource-group-icon" :class="group"><HomeIcon :name="group === 'access' ? 'devices' : group === 'visualization' ? 'screen' : 'agent'" /></span>{{ t(groupTitleKey(group)) }}</h4>
        <div class="home-resource-subgroups">
          <section v-for="subgroup in subgroupRows(group)" :key="subgroup" class="home-surface">
            <h5>{{ t(`packages.ProjectHome.group_${subgroup}`) }}</h5>
            <ResourceItem v-for="row in rows.filter(item => item.subgroup === subgroup)" :key="row.id"
              :row="row" :show-icon="chart.showIcon" :can-open="canOpen" :unavailable-hint="unavailableHint(row)"
              @navigate="open" />
          </section>
        </div>
      </section>
    </template>
    <template v-else>
      <ResourceItem v-for="row in rows" :key="row.id" metric :row="row" :show-icon="chart.showIcon"
        :can-open="canOpen" :unavailable-hint="unavailableHint(row)" @navigate="open" />
    </template>
  </div>
</template>
<script setup lang="ts" name="ProjectHomeResourcesView">
import { computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import HomeIcon from '../../shared/HomeIcon.vue'
import { isSaaS } from '@jetlinks-web-core/utils/consts'
import ResourceItem from './ResourceItem.vue'
import type { HomeRow, HomeChart, HomeTarget } from '../../shared/types'
const props = defineProps({
  rows: { type: Array as PropType<HomeRow[]>, default: () => [] },
  chart: { type: Object as PropType<HomeChart>, required: true },
  canOpen: { type: Function as PropType<(target?: HomeTarget) => boolean>, required: true },
  open: { type: Function as PropType<(target?: HomeTarget) => void>, required: true },
})
const { t } = useI18n()
const label = (row: HomeRow) => row.label || t(`packages.ProjectHome.${row.labelKey}`)
const groups = computed(() => [...new Set(props.rows.map(row => row.group))])
const subgroupRows = (group?: string) => [...new Set(props.rows.filter(row => row.group === group).map(row => row.subgroup))]
const isAsymmetricAccess = computed(() => subgroupRows('access').length === 1 && subgroupRows('visualization').length === 2)
const groupTitleKey = (group?: string) => group === 'intelligence' && isSaaS
  ? 'packages.ProjectHome.group_intelligence_saas'
  : `packages.ProjectHome.group_${group}`
const unavailableHint = (row: HomeRow) => row.id === 'video'
  ? t('packages.ProjectHome.resourceUnavailableVideo')
  : t('packages.ProjectHome.resourceUnavailable', { resource: label(row) })
</script>
<style scoped lang="less" src="../../shared/views.less" />

<style scoped>
/* 平台过滤后只有一张子卡时填满分组，不保留第二列空位。 */
.home-resource-subgroups > .home-surface:only-child { grid-column: 1 / -1; }
.home-surface h5 { padding-inline: 8px; }
.resource-group-title { display: flex; align-items: center; gap: 8px; }
.home-content .resource-group-title { font-size: 15px; line-height: 26px; font-weight: 400; }
.resource-group-icon { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; flex-shrink: 0; border-radius: 8px; background: #e8f1ff; }
.resource-group-icon.intelligence { background: #9254de1f; }
.home-resources--asymmetric {
  grid-template-columns: 1fr 2fr;
}
@container business-component-shell (max-width: 620px) {
  .home-resources--asymmetric {
    grid-template-columns: 1fr;
  }
}
</style>
