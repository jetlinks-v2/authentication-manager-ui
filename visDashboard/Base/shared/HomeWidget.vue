<template>
  <a-card class="project-home-shell" :data-home-feature="feature" :bordered="false"
    :style="tokens" :body-style="{ flex: 1, minHeight: 0, padding: '16px 20px 20px' }">
    <template #title><div class="home-widget-title"><strong>{{ t(`packages.ProjectHome.${feature}`) }}</strong><span v-if="description">{{ description }}</span></div></template>
    <template #extra>
      <slot name="extra" :more-target="moreTarget" :can-open="canOpen" :open="open">
        <a-button v-if="!hideMore && moreTarget && config.chart.navigation" type="link" size="small" :disabled="!canOpen(moreTarget)" @click="open(moreTarget)">
          {{ moreText }} ›
        </a-button>
      </slot>
    </template>
    <div v-if="loading && !rows.length" class="home-state"><a-spin /></div>
    <div v-else-if="error" class="home-state"><a-empty :description="t('packages.ProjectHome.loadError')"><a-button @click="retry">{{ t('packages.ProjectHome.alarmRetry') }}</a-button></a-empty></div>
    <slot v-else-if="!rows.length" name="empty" :can-open="canOpen" :open="open">
      <div class="home-state">
        <a-empty :description="emptyDescription">
          <a-button v-if="!hideMore && moreTarget && canOpen(moreTarget)" size="small" @click="open(moreTarget)">{{ moreText }}</a-button>
        </a-empty>
      </div>
    </slot>
    <template v-else>
      <a-alert v-if="rows.some(row => row.failed)" type="warning" :message="t('packages.ProjectHome.loadError')" show-icon>
        <template #action><a-button size="small" @click="retry">{{ t('packages.ProjectHome.alarmRetry') }}</a-button></template>
      </a-alert>
      <slot :rows="rows" :chart="config.chart" :can-open="canOpen" :open="open" />
    </template>
  </a-card>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { theme } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { getHomeConfig } from './config'
import { useHomeRuntime } from './useHomeRuntime'
import { useHomeNavigation } from './useHomeNavigation'
import { HOME_MORE_TARGETS } from './navigation'
import type { HomeFeature, HomeInfo } from './types'
const props = defineProps<{ feature: HomeFeature; info?: HomeInfo; isEdit: boolean; refreshKey?: number; hideMore?: boolean }>()
const { t, te } = useI18n()
const description = computed(() => {
  const key = `packages.ProjectHome.${props.feature}Desc`
  return te(key) ? t(key) : ''
})
const emptyDescription = computed(() => {
  const key = `packages.ProjectHome.${props.feature}EmptyHint`
  return te(key) ? t(key) : t('packages.ProjectHome.empty')
})
const { token } = theme.useToken()
const config = computed(() => getHomeConfig(props.feature, props.info))
const { rows, loading, error, retry } = useHomeRuntime(props.feature, computed(() => props.isEdit), computed(() => config.value.refreshTime), computed(() => props.refreshKey || 0))
const { canOpen, open } = useHomeNavigation(computed(() => config.value.chart.navigation), computed(() => props.isEdit))
const moreTarget = HOME_MORE_TARGETS[props.feature]
const moreText = computed(() => {
  if (props.feature === 'Applications') return t('packages.ProjectHome.ApplicationsMore')
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
.project-home-shell { height: 100%; display: flex; flex-direction: column; container-name: business-component-shell project-home; container-type: size; overflow: hidden; border-radius: 6px; background: #fff; box-shadow: 0 1px 3px rgb(31 35 41 / 4%); }
.project-home-shell :deep(.ant-card-head) { flex-shrink: 0; min-height: 42px; padding: 20px 20px 0; border-bottom: 0; }
.project-home-shell :deep(.ant-card-head-title) { padding: 0; color: #1d2129; font-size: 18px; line-height: 22px; font-weight: 600; }
.home-widget-title { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.home-widget-title strong { white-space: normal; }
.home-widget-title span { color: var(--business-component-muted); font-size: 12px; font-weight: 400; line-height: 18px; white-space: normal; }
.project-home-shell :deep(.ant-card-body) { display: flex; flex-direction: column; gap: 10px; overflow: hidden; }
.project-home-shell :deep(.ant-card-body::before), .project-home-shell :deep(.ant-card-body::after) { display: none; }
.project-home-shell :deep(.ant-card-body > .home-content) { flex: 1; height: auto; }
.project-home-shell :deep(.ant-alert) { flex-shrink: 0; }
.project-home-shell :deep(.ant-card-extra .ant-btn) { padding: 0; height: auto; font-size: 13px; line-height: 20px; color: #83899f; transition: color 0.2s ease; &:hover { color: #1e72f0; } }
.home-state { display: grid; place-items: center; height: 100%; overflow: auto; }
</style>
