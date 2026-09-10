<template>
  <div class="home-content home-resources" :class="{ 'home-resources--metrics': chart.displayStyle === 'metrics' }">
    <template v-if="chart.displayStyle === 'default'">
      <section v-for="group in groups" :key="group" class="home-resource-group" :class="{ 'home-resource-group--wide': group === 'intelligence' }">
        <h4 class="resource-group-title"><span v-if="chart.showIcon" class="resource-group-icon" :class="group"><HomeIcon :name="group === 'access' ? 'devices' : group === 'visualization' ? 'screen' : 'agent'" /></span>{{ t(`packages.ProjectHome.group_${group}`) }}</h4>
        <div class="home-resource-subgroups">
          <section v-for="subgroup in subgroupRows(group)" :key="subgroup" class="home-surface">
            <h5>{{ t(`packages.ProjectHome.group_${subgroup}`) }}</h5>
            <div v-for="row in rows.filter(item => item.subgroup === subgroup)" :key="row.id" class="home-resource-row">
              <HomeIcon v-if="chart.showIcon" :name="row.icon"/><span>{{ label(row) }}</span><strong>{{ number(row.value) }}</strong>
            </div>
          </section>
        </div>
      </section>
    </template>
    <template v-else>
      <div v-for="row in rows" :key="row.id" class="home-resource-metric home-surface">
        <HomeIcon v-if="chart.showIcon" :name="row.icon"/><span>{{ label(row) }}</span><strong>{{ number(row.value) }}</strong>
      </div>
    </template>
  </div>
</template>
<script setup lang="ts" name="ProjectHomeResourcesView">
import { computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import HomeIcon from '../../shared/HomeIcon.vue'
import type { HomeRow, HomeChart } from '../../shared/types'
const props = defineProps({
  rows: { type: Array as PropType<HomeRow[]>, default: () => [] },
  chart: { type: Object as PropType<HomeChart>, required: true },
})
const { t } = useI18n()
const label = (row: HomeRow) => row.label || t(`packages.ProjectHome.${row.labelKey}`)
const number = (value?: number) => value === undefined ? '—' : value.toLocaleString()
const groups = computed(() => [...new Set(props.rows.map(row => row.group))])
const subgroupRows = (group?: string) => [...new Set(props.rows.filter(row => row.group === group).map(row => row.subgroup))]
</script>
<style scoped lang="less" src="../../shared/views.less" />

<style scoped>
/* 平台过滤后只有一张子卡时填满分组，不保留第二列空位。 */
.home-resource-subgroups > .home-surface:only-child { grid-column: 1 / -1; }
.resource-group-title { display: flex; align-items: center; gap: 8px; }
.home-content .resource-group-title { font-size: 15px; line-height: 26px; font-weight: 400; }
.resource-group-icon { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; flex-shrink: 0; border-radius: 8px; background: #e8f1ff; }
.resource-group-icon.intelligence { background: #9254de1f; }
</style>
