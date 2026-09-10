<template>
  <a-card class="project-home-shell" :data-home-feature="feature" :bordered="false" :title="t(`packages.ProjectHome.${feature}`)"
    :style="tokens" :body-style="{ flex: 1, minHeight: 0, padding: '16px 24px 20px' }">
    <template #extra>
      <a-button v-if="moreTarget && config.chart.navigation" type="link" size="small" :disabled="!canOpen(moreTarget)" @click="open(moreTarget)">
        {{ t('packages.ProjectHome.more') }} ›
      </a-button>
    </template>
    <div v-if="loading && !rows.length" class="home-state"><a-spin /></div>
    <div v-else-if="error || !rows.length" class="home-state"><a-empty :description="t(error ? 'packages.ProjectHome.loadError' : 'packages.ProjectHome.empty')" /></div>
    <slot v-else :rows="rows" :chart="config.chart" :can-open="canOpen" :open="open" />
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
const props = defineProps<{ feature: HomeFeature; info?: HomeInfo; isEdit: boolean; refreshKey?: number }>()
const { t } = useI18n()
const { token } = theme.useToken()
const config = computed(() => getHomeConfig(props.feature, props.info))
const { rows, loading, error } = useHomeRuntime(props.feature, computed(() => props.isEdit), computed(() => config.value.refreshTime), computed(() => props.refreshKey || 0))
const { canOpen, open } = useHomeNavigation(computed(() => config.value.chart.navigation), computed(() => props.isEdit))
const moreTarget = HOME_MORE_TARGETS[props.feature]
const tokens = computed(() => ({
  '--home-font-size': `${config.value.chart.fontSize}px`,
  '--home-card-surface': '#f7f8fa',
  '--business-component-primary': token.value.colorPrimary,
  '--business-component-text': token.value.colorText,
  '--business-component-muted': token.value.colorTextSecondary,
  '--business-component-track': token.value.colorFillSecondary,
}))
</script>
<style scoped lang="less">
.project-home-shell { height: 100%; display: flex; flex-direction: column; container-name: business-component-shell project-home; container-type: size; overflow: hidden; border-radius: 12px; background: #fff; box-shadow: 0 1px 3px #1118270a; }
/* 原型为无分隔线的轻量标题区，避免默认 Card 标题字重与固定头部高度。 */
.project-home-shell :deep(.ant-card-head) { flex-shrink: 0; min-height: 42px; padding: 20px 24px 0; border-bottom: 0; }
.project-home-shell :deep(.ant-card-head-title) { padding: 0; font-size: 18px; line-height: 22px; font-weight: 400; }
.project-home-shell :deep(.ant-card-extra .ant-btn) { padding: 0; height: auto; font-size: 12px; line-height: 20px; }
.home-state { display: grid; place-items: center; height: 100%; overflow: auto; }
</style>
