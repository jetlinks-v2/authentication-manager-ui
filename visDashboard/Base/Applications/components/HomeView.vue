<template>
  <div class="home-content home-apps" :class="{ 'home-apps--cards': chart.displayStyle === 'cards' }">
    <button v-for="row in rows" :key="row.id" class="home-app" :disabled="!canOpen(row.target)" :title="actionHint(row)" @click="$emit('navigate', row.target)">
      <span class="home-app-icon"><HomeIcon name="applications"/></span>
      <span class="home-app-content"><strong>{{ label(row) }}</strong><span v-if="chart.showDescription && row.description" class="home-muted home-description">{{ row.description }}</span></span>
    </button>
  </div>
</template>
<script setup lang="ts" name="ProjectHomeApplicationsView">
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
