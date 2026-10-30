<template>
  <HomeWidget feature="Applications" :info="info" :is-edit="isEdit">
    <template #default="view">
      <HomeView
        :rows="view.rows"
        :chart="view.chart"
        :can-open="canOpenApp"
        :opening-ids="openingApplicationIds"
        @open="handleOpenApp"
      />
    </template>
    <template #empty>
      <CloudEmpty class="home-app-empty">
        <template #description>
          <div class="empty-title">{{ t('packages.ProjectHome.ApplicationsEmpty') }}</div>
          <div v-if="canCreateApp" class="empty-desc">{{ t('packages.ProjectHome.ApplicationsEmptyDesc') }}</div>
        </template>
        <a-button v-if="canCreateApp" type="primary" class="empty-btn" @click="handleCreateApp">
          {{ t('packages.ProjectHome.ApplicationsCreate') }}
        </a-button>
      </CloudEmpty>
    </template>
  </HomeWidget>
</template>
<script setup lang="ts">
import CloudEmpty from '@jetlinks-web-core/components/CloudEmpty/index.vue'
import { useI18n } from 'vue-i18n'
import HomeWidget from '../shared/HomeWidget.vue'
import HomeView from './components/HomeView.vue'
import type { HomeInfo } from '../shared/types'
import { useHomeApplications } from './useHomeApplications'

const props = withDefaults(defineProps<{ info?: HomeInfo; isEdit?: boolean }>(), { isEdit: false })
const { t } = useI18n()
const { openingApplicationIds, canOpenApp, canCreateApp, handleOpenApp, handleCreateApp } = useHomeApplications({
  isEdit: () => props.isEdit,
  info: () => props.info,
})
</script>
<style scoped lang="less">
.home-app-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 4px 8px;
  box-sizing: border-box;
}
.home-app-empty :deep(.ant-empty) { margin: 0; }
.empty-title {
  font-size: 13px;
  line-height: 18px;
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 2px;
}
.empty-desc {
  font-size: 12px;
  line-height: 16px;
  color: #6b7280;
  max-width: 240px;
  margin-inline: auto;
}
.empty-btn {
  border-radius: 6px;
  height: 28px;
  padding: 0 14px;
  font-size: 12px;
}
</style>
