<template>
  <a-card class="project-home-shell" :data-home-feature="feature" :bordered="false" :title="t(`packages.ProjectHome.${feature}`)"
    :style="tokens" :body-style="{ flex: 1, minHeight: 0, padding: '16px 20px 20px' }">
    <template #extra>
      <slot name="extra" :more-target="moreTarget" :can-open="canOpen" :open="open">
        <a-button v-if="moreTarget && config.chart.navigation" type="link" size="small" :disabled="!canOpen(moreTarget)" @click="open(moreTarget)">
          {{ moreText }} ›
        </a-button>
      </slot>
    </template>
    <div v-if="loading && !rows.length" class="home-state"><a-spin /></div>
    <div v-else-if="error" class="home-state"><a-empty :description="t('packages.ProjectHome.loadError')" /></div>
    <slot v-else-if="!rows.length" name="empty" :can-open="canOpen" :open="open">
      <div class="home-state"><a-empty :description="t('packages.ProjectHome.empty')" /></div>
    </slot>
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
.project-home-shell { height: 100%; display: flex; flex-direction: column; container-name: business-component-shell project-home; container-type: size; overflow: hidden; border-radius: 10px; background: #fff; box-shadow: 0 1px 3px rgb(31 35 41 / 4%); }
.project-home-shell :deep(.ant-card-head) { flex-shrink: 0; min-height: 42px; padding: 20px 20px 0; border-bottom: 0; }
.project-home-shell :deep(.ant-card-head-title) { padding: 0; color: #1d2129; font-size: 18px; line-height: 22px; font-weight: 600; }
.project-home-shell :deep(.ant-card-extra .ant-btn) { padding: 0; height: auto; font-size: 13px; line-height: 20px; color: #83899f; transition: color 0.2s ease; &:hover { color: #1e72f0; } }
.home-state { display: grid; place-items: center; height: 100%; overflow: auto; }
</style>
