<template>
  <div class="home-content home-actions" :class="{ 'home-actions--grid': chart.displayStyle === 'grid' }">
    <button
      v-for="row in rows"
      :key="row.id"
      class="home-action"
      :disabled="!canOpen(row.target)"
      :title="actionHint(row)"
      @click="$emit('navigate', row.target)"
    >
      <HomeIcon v-if="chart.showIcon" :name="row.id === 'video' ? 'addVideo' : row.icon" neutral />
      <span class="home-action-label">{{ label(row) }}</span>
    </button>
  </div>
</template>
<script setup lang="ts" name="ProjectHomeQuickActionsView">
import { type PropType } from 'vue'
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
</script>
<style scoped lang="less" src="../../shared/views.less" />
