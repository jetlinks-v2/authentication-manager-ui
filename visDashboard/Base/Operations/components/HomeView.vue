<template>
  <div class="home-content home-operations" :class="{ 'home-operations--cards': chart.displayStyle === 'cards' }">
    <section v-for="group in groups" :key="group">
      <h4>{{ t(`packages.ProjectHome.group_${group}`) }}</h4>
      <div class="home-operation-items">
        <template v-for="row in rows.filter(item => item.group === group)" :key="row.id">
        <slot v-if="group === 'alarms'" name="alarm" :row="row" />
        <button v-else class="home-operation home-surface" :disabled="!canOpen(row.target)" :title="actionHint(row)" @click="$emit('navigate', row.target)">
          <span class="home-operation-title"><HomeIcon :name="row.icon || row.id"/><span>{{ label(row) }}</span></span>
          <span v-if="group === 'health'" class="home-statuses"><span class="home-online">{{ t('packages.ProjectHome.online') }} {{ number(row.online) }}</span><span class="home-muted">{{ t('packages.ProjectHome.offline') }} {{ number(row.offline) }}</span></span>
          <strong v-else>{{ number(row.value) }}</strong>
          <span v-if="chart.showProgress && group === 'health'" class="home-progress"><i :style="{ width: `${healthPercent(row)}%` }" /></span>
        </button>
        </template>
      </div>
    </section>
  </div>
</template>
<script setup lang="ts" name="ProjectHomeOperationsView">
import { computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import HomeIcon from '../../shared/HomeIcon.vue'
import type { HomeRow, HomeChart, HomeTarget } from '../../shared/types'
const props = defineProps({
  rows: { type: Array as PropType<HomeRow[]>, default: () => [] },
  chart: { type: Object as PropType<HomeChart>, required: true },
  canOpen: { type: Function as PropType<(target?: HomeTarget) => boolean>, required: true },
})
defineEmits<{ navigate: [target?: HomeTarget] }>()
const { t } = useI18n()
const label = (row: HomeRow) => row.label || t(`packages.ProjectHome.${row.labelKey}`)
const actionHint = (row: HomeRow) => props.canOpen(row.target) ? label(row) : t('packages.ProjectHome.unavailable')
const number = (value?: number) => value === undefined ? '—' : value.toLocaleString()
const healthPercent = (row: HomeRow) => row.online !== undefined && row.offline !== undefined && row.online + row.offline > 0 ? row.online / (row.online + row.offline) * 100 : 0
const groups = computed(() => [...new Set(props.rows.map(row => row.group))])
</script>
<style scoped lang="less" src="../../shared/views.less" />
