<template>
  <div class="home-content home-announcements" :class="{ 'home-announcements--timeline': chart.displayStyle === 'timeline' }">
    <button v-for="row in rows" :key="row.id" class="home-announcement" :disabled="!chart.navigation" :title="row.description || label(row)" @click="$emit('select', row)">
      <time v-if="chart.showDate" class="home-muted">{{ row.date }}</time><span class="home-app-content"><span>{{ label(row) }}</span><span v-if="chart.showDescription && row.description && row.description !== label(row)" class="home-muted">{{ row.description }}</span></span>
    </button>
  </div>
</template>
<script setup lang="ts" name="ProjectHomeAnnouncementsView">
import { type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { HomeRow, HomeChart, HomeTarget } from '../../shared/types'
const props = defineProps({
  rows: { type: Array as PropType<HomeRow[]>, default: () => [] },
  chart: { type: Object as PropType<HomeChart>, required: true },
  canOpen: { type: Function as PropType<(target?: HomeTarget) => boolean>, required: true },
})
defineEmits<{ select: [row: HomeRow] }>()
const { t } = useI18n()
const label = (row: HomeRow) => row.label || t(`packages.ProjectHome.${row.labelKey}`)
</script>
<style scoped lang="less" src="../../shared/views.less" />
