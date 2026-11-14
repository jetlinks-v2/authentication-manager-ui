<template>
  <main class="project-overview" :class="isSaaS ? 'project-overview--saas' : 'project-overview--private'">
    <a-result v-if="failed" status="error" :title="t('projectOverview.loadError')">
      <template #extra><a-button @click="retry">{{ t('projectOverview.retry') }}</a-button></template>
    </a-result>
    <component v-else :is="layoutComponent" />
  </main>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { isSaaS } from '@jetlinks-web-core/utils/consts'
import { useOverviewLayout } from './useOverviewAsync'

defineOptions({ name: 'ProjectSideOverview' })

const { t } = useI18n()
// 不静态引入另一种部署的页面，避免共享卡片被意外提前加载。
const { component: layoutComponent, failed, retry } = useOverviewLayout(isSaaS
  ? () => import('./SaasOverviewPage.vue')
  : () => import('./PrivateOverviewLayout.vue'))
</script>
<style scoped>
.project-overview {
  width: 100%;
  min-width: 0;
  margin-inline: auto;
  height: auto;
  min-height: 0;
  box-sizing: border-box;
}

/* 水平基础间距由外层页面提供，概览不再随屏幕宽度额外收窄。 */
.basic-layout-page:not(:has(.ant-layout-sider)):not(:has(.project-secondary-menu .ant-tabs-left)) .project-overview {
  padding: 0 0 var(--space-4, 16px);
}
.project-overview--saas, .project-overview--private {
  --business-component-text: var(--ink-1, #1f2329);
  --business-component-muted: var(--ink-3, #646c73);
  --business-component-primary: var(--accent, #1677ff);
  --home-card-surface: var(--bg-sunken, #f7f9fc);
}
</style>
<style scoped lang="less" src="./overviewCanvas.less"></style>
