<template>
  <a-card v-if="available" class="project-home-shell" :class="{ 'project-home-shell--saas': config.chart.displayStyle === 'saas', 'project-home-shell--private': config.chart.displayStyle === 'private' }" :data-home-feature="feature" :bordered="false"
    :style="tokens" :body-style="{ flex: 1, minHeight: 0, padding: '16px 20px 20px' }">
    <template #title>
      <div class="home-widget-title">
        <div class="home-widget-heading"><strong>{{ t(`packages.ProjectHome.${config.chart.titleKey || titleKey}`) }}</strong><slot name="title-extra" /></div>
        <span v-if="description && !compact">{{ description }}</span>
      </div>
    </template>
    <template #extra>
      <slot name="extra" :more-target="moreTarget" :can-open="canOpen" :open="open"
        :rows="rows" :loading="loading" :error="error" :updated-at="updatedAt">
        <a-button v-if="!hideMore && moreTarget && config.chart.navigation && (!compact || canOpen(moreTarget))" type="link" size="small" :disabled="!canOpen(moreTarget)" @click="open(moreTarget)">
          {{ moreText }} ›
        </a-button>
      </slot>
    </template>
    <div v-if="loading && !rows.length" class="home-state"><a-spin /></div>
    <div v-else-if="error" class="home-state"><CloudEmpty :description="t('packages.ProjectHome.loadError')"><a-button @click="retry">{{ t('packages.ProjectHome.alarmRetry') }}</a-button></CloudEmpty></div>
    <slot v-else-if="!rows.length" name="empty" :can-open="canOpen" :open="open">
      <div class="home-state">
        <CloudEmpty :description="emptyDescription">
          <a-button v-if="!hideMore && moreTarget && canOpen(moreTarget)" size="small" @click="open(moreTarget)">{{ moreText }}</a-button>
        </CloudEmpty>
      </div>
    </slot>
    <template v-else>
      <a-alert v-if="rows.some(row => row.failed)" type="warning" :message="config.chart.displayStyle === 'saas' ? t('packages.ProjectHome.saasMetricsFailed', { names: failedMetricLabels(rows, t) }) : t('packages.ProjectHome.loadError')" show-icon>
        <template #action><a-button size="small" @click="retry">{{ t('packages.ProjectHome.alarmRetry') }}</a-button></template>
      </a-alert>
      <slot :rows="visibleRows" :chart="config.chart" :can-open="canOpen" :open="open" />
    </template>
  </a-card>
</template>
<script setup lang="ts">
import CloudEmpty from '@jetlinks-web-core/components/CloudEmpty/index.vue'
import { computed } from 'vue'
import { theme } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { getHomeConfig } from './config'
import { useHomeRuntime } from './useHomeRuntime'
import { useHomeNavigation } from './useHomeNavigation'
import { HOME_MORE_TARGETS } from './navigation'
import type { HomeFeature, HomeInfo } from './types'
import { failedMetricLabels } from '../Saas/services/presentation'
const props = defineProps<{ feature: HomeFeature; info?: HomeInfo; isEdit: boolean; refreshKey?: number; hideMore?: boolean }>()
const { t, te } = useI18n()
const description = computed(() => {
  const key = `packages.ProjectHome.${titleKey.value}Desc`
  return te(key) ? t(key) : ''
})
const emptyDescription = computed(() => {
  const key = `packages.ProjectHome.${props.feature}EmptyHint`
  return te(key) ? t(key) : t('packages.ProjectHome.empty')
})
const { token } = theme.useToken()
const config = computed(() => getHomeConfig(props.feature, props.info))
const compact = computed(() => ['saas', 'private'].includes(config.value.chart.displayStyle))
// SaaS 概览应用卡片使用有界查询，其他应用列表与快捷引导沿用既有数据源。
const source = computed<HomeFeature>(() => props.feature === 'Applications' && config.value.chart.displayStyle === 'saas' ? 'SaasApplications' : props.feature)
const { rows, loading, error, retry, available, titleKey, updatedAt } = useHomeRuntime(props.feature, computed(() => props.isEdit), computed(() => config.value.refreshTime), computed(() => props.refreshKey || 0), undefined, undefined, source)
// 首页摘要限制展示条数，完整数据仍交给运行时及管理入口，不创建列表内滚动。
const visibleRows = computed(() => config.value.chart.maxItems ? rows.value.slice(0, config.value.chart.maxItems) : rows.value)
const { canOpen, open } = useHomeNavigation(computed(() => config.value.chart.navigation), computed(() => props.isEdit))
const moreTarget = HOME_MORE_TARGETS[props.feature]
const moreText = computed(() => {
  if (props.feature === 'Applications') return t(compact.value
    ? 'packages.ProjectHome.saasApplicationsMore' : 'packages.ProjectHome.ApplicationsMore')
  return t('packages.ProjectHome.more')
})
const tokens = computed(() => ({
  '--home-font-size': `${config.value.chart.fontSize}px`,
  '--home-card-surface': '#f7f9fc',
  '--business-component-primary': token.value.colorPrimary,
  '--business-component-text': token.value.colorText,
  '--business-component-muted': token.value.colorTextSecondary,
  '--business-component-track': token.value.colorFillSecondary,
}))
</script>
<style scoped lang="less">
.project-home-shell { height: 100%; display: flex; flex-direction: column; container-name: business-component-shell project-home; container-type: size; overflow: hidden; border-radius: var(--r-3, 8px); background: #fff; box-shadow: 0 1px 3px rgb(31 35 41 / 4%); }
.project-home-shell :deep(.ant-card-head) { flex-shrink: 0; min-height: 42px; padding: 20px 20px 0; border-bottom: 0; }
.project-home-shell :deep(.ant-card-head-title) { padding: 0; color: #1d2129; font-size: 18px; line-height: 22px; font-weight: 600; }
.home-widget-title { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.home-widget-title strong { white-space: normal; }
.home-widget-heading { display: flex; align-items: center; gap: 8px; min-width: 0; }
.home-widget-title > span { color: var(--business-component-muted); font-size: 12px; font-weight: 400; line-height: 18px; white-space: normal; }
.project-home-shell :deep(.ant-card-body) { display: flex; flex-direction: column; gap: 10px; overflow: hidden; }
.project-home-shell :deep(.ant-card-body::before), .project-home-shell :deep(.ant-card-body::after) { display: none; }
.project-home-shell :deep(.ant-card-body > .home-content) { flex: 1; height: auto; }
.project-home-shell :deep(.ant-alert) { flex-shrink: 0; }
.project-home-shell :deep(.ant-card-extra .ant-btn) { padding: 0; height: auto; font-size: 13px; line-height: 20px; color: #83899f; transition: color 0.2s ease; &:hover { color: #1e72f0; } }
.home-state { display: grid; place-items: center; height: 100%; overflow: auto; }
</style>
<style scoped lang="less">
.project-home-shell--saas {
  height: auto; container-type: inline-size; overflow: visible;
  .home-widget-title strong { font-weight: 600; }
  :deep(.ant-card-head) { padding: 0 18px; min-height: 46px; border-bottom: 1px solid var(--line, #f2f3f5); }
  :deep(.ant-card-head-title) { font-size: 15px; line-height: 22px; }
  :deep(.ant-card-body) { padding: 14px 18px 18px !important; overflow: visible; }
  .home-state { min-height: 120px; height: auto; overflow: visible; }
  :deep(.home-content) { overflow: visible; }
  :deep(.home-state .ant-empty-image) { height: 64px; }
}
/* 私有化应用嵌在固定概览首行，用独立紧凑变体保持三条应用与相邻接入区等高。 */
.project-home-shell--private {
  container-type: inline-size; overflow: visible; box-shadow: none;
  border: 1px solid var(--line, #e5e6eb);
  :deep(.ant-card-head) { padding: 0 18px; min-height: 44px; border-bottom: 1px solid var(--line, #f2f3f5); }
  :deep(.ant-card-head-title) { font-size: 15px; line-height: 22px; }
  :deep(.ant-card-body) { padding: 6px !important; overflow: visible; gap: 4px; }
  :deep(.ant-card-extra .ant-btn) { font-size: 12px; }
  :deep(.home-content) { overflow: visible; }
  .home-state { height: auto; min-height: 110px; overflow: visible; }
  :deep(.ant-empty-image) { height: 48px; }
  :deep(.ant-empty) { margin: 0; }
}
</style>
