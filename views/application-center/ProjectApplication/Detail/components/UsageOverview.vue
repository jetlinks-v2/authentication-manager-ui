<template>
  <div class="usage-overview">
    <header class="panel-heading">
      <div>
        <h2>{{ $t('ProjectApplication.usage.title') }}</h2>
        <p>{{ $t('ProjectApplication.usage.subtitle') }}</p>
      </div>
    </header>

    <ResponsiveGrid :min="320" gap="var(--space-4)">
      <SectionCard
        v-for="service in services"
        :key="service.id"
        :icon="service.icon"
        :title="$t(service.nameKey)"
        :sub="$t(service.editionKey)"
      >
        <template v-if="service.metrics.length">
          <div class="usage-summary">
            <span>{{ $t('ProjectApplication.usage.highest') }}</span>
            <strong>{{ highestUsage(service.metrics) }}%</strong>
          </div>
          <div class="usage-metrics">
            <div v-for="metric in service.metrics" :key="metric.id" class="metric-row">
              <div class="metric-label">
                <span>{{ $t(metric.labelKey) }}</span>
                <b>{{ formatNumber(metric.current) }} / {{ formatNumber(metric.limit) }}{{ metric.unit ? ` ${metric.unit}` : '' }}</b>
              </div>
              <a-progress :percent="usagePercent(metric.current, metric.limit)" :show-info="false" size="small" />
            </div>
          </div>
        </template>
        <p v-else class="usage-note">{{ service.noteKey ? $t(service.noteKey) : '' }}</p>
      </SectionCard>
    </ResponsiveGrid>
  </div>
</template>

<script setup lang="ts" name="ProjectApplicationUsageOverview">
import type { PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { UsageMetric, UsageService } from '../../types'

defineProps({
  services: {
    type: Array as PropType<UsageService[]>,
    default: () => [],
  },
})

const { t: $t } = useI18n()
const usagePercent = (current: number, limit: number) => limit ? Math.min(100, Math.round(current / limit * 100)) : 0
const highestUsage = (metrics: UsageMetric[]) => Math.max(...metrics.map((item) => usagePercent(item.current, item.limit)))
const formatNumber = (value: number) => new Intl.NumberFormat().format(value)
</script>

<style scoped>
.panel-heading { margin-bottom: var(--space-4); }
.panel-heading h2 { margin: 0; color: var(--ink-1); font-size: var(--fs-16); }
.panel-heading p { margin: var(--space-1) 0 0; color: var(--ink-3); }

.usage-summary {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: var(--space-3);
  color: var(--ink-3);
}

.usage-summary strong { color: var(--ink-1); font-size: var(--fs-18); }
.usage-metrics { display: flex; flex-direction: column; gap: var(--space-3); }
.metric-label { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-1); font-size: var(--fs-12); }
.metric-label span { color: var(--ink-2); }
.metric-label b { color: var(--ink-1); white-space: nowrap; }
.usage-note { margin: 0; color: var(--ink-3); line-height: 1.7; }
</style>
