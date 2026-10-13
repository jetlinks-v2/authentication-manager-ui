<template>
  <div class="project-home-shell quick-guide-shell">
    <div class="quick-guide-main">
      <h3 class="guide-title">{{ t('packages.ProjectHome.QuickGuide') }}</h3>
      <span class="guide-subtitle">{{ t('packages.ProjectHome.QuickGuide_subtitle') }}</span>
    </div>
    <div class="quick-guide-content">
      <HomeView :steps="steps" @action="handleAction" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { HomeInfo } from '../shared/types'
import HomeView from './components/HomeView.vue'
import { useQuickGuideSteps } from './useQuickGuideSteps'

const props = withDefaults(defineProps<{ info?: HomeInfo; isEdit?: boolean }>(), { isEdit: false })
const { t } = useI18n()
const { steps, handleAction } = useQuickGuideSteps(() => props.isEdit)
</script>

<style scoped lang="less">
.quick-guide-shell {
  --guide-accent: #1e72f0;
  --guide-title: #1d2129;
  --guide-description: #4e5969;
  --guide-secondary: #86909c;
  --guide-border: #eceff3;
  height: 100%;
  display: flex;
  flex-direction: column;
  container-name: business-component-shell project-home;
  container-type: size;
  overflow: hidden;
  border: 1px solid #fff;
  border-radius: var(--r-5, 12px);
  background: var(--panel-background, rgb(255 255 255 / .8));
  backdrop-filter: blur(2px);
  box-sizing: border-box;
  padding: var(--space-4, 16px);
}
.quick-guide-main { display: flex; align-items: baseline; gap: var(--space-2, 8px); min-width: 0; flex-shrink: 0; }
.guide-title { margin: 0; font-size: var(--fs-18, 18px); line-height: 24px; font-weight: 600; color: var(--guide-title); flex-shrink: 0; }
.guide-subtitle { color: var(--guide-secondary); font-size: var(--fs-14, 14px); line-height: 20px; }
.quick-guide-content { flex: 1; min-height: 0; margin-top: var(--space-4, 16px); }

@container project-home (max-height: 140px) {
  .quick-guide-content { margin-top: var(--space-2, 8px); }
  .guide-subtitle { display: none; }
}
</style>
