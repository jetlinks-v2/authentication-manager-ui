<template>
  <HomeWidget feature="SaasResources" :info="info" :is-edit="isEdit">
    <template #extra="{ canOpen, open }">
      <a-button v-if="canOpen(SAAS_TARGETS.dashboard)" type="link" size="small" class="home-widget-more" @click="open(SAAS_TARGETS.dashboard)">
        {{ $t('packages.ProjectHome.saasResourceDashboard') }}<RightOutlined class="home-widget-arrow" />
      </a-button>
    </template>
    <template #default="view"><ResourceOverview :rows="view.rows" :can-open="view.canOpen" @navigate="view.open" /></template>
  </HomeWidget>
</template>
<script setup lang="ts">
import { RightOutlined } from '@ant-design/icons-vue'
import HomeWidget from '../shared/HomeWidget.vue'
import ResourceOverview from './components/ResourceOverview.vue'
import { SAAS_TARGETS } from './targets'
import type { HomeInfo } from '../shared/types'
withDefaults(defineProps<{ info?: HomeInfo; isEdit?: boolean }>(), { isEdit: false })
</script>
<style scoped lang="less">
.home-widget-more {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0;
  height: auto;
  font-size: 13px;
  line-height: 20px;
  color: var(--business-component-primary, #1677ff);
  transition: color 0.2s ease;

  &:hover:not(:disabled) {
    color: var(--ant-color-primary-hover, #4096ff);
    .home-widget-arrow { transform: translateX(2px); }
  }
}
.home-widget-arrow {
  font-size: 8.5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  transition: transform 0.2s ease;
}
</style>
