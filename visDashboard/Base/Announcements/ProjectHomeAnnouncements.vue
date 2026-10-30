<template>
  <HomeWidget feature="Announcements" :info="info" :is-edit="isEdit" :refresh-key="refreshKey" hide-more>
    <template #title-extra>
      <a-badge v-if="isSaas && unreadCount" :count="unreadCount" :overflow-count="99"
        :title="$t('Announcement.inbox.unreadCount', { count: unreadCount > 99 ? '99+' : unreadCount })" />
    </template>
    <template #extra>
      <a-button type="link" size="small" :disabled="!canOpenAll" class="home-widget-more" @click="openAll">
        {{ $t('packages.ProjectHome.announcementsMore') }}<RightOutlined class="home-widget-arrow" />
      </a-button>
    </template>
    <template #default="view"><HomeView v-bind="view" @select="select" /></template>
  </HomeWidget>
</template>
<script setup lang="ts">
import { RightOutlined } from '@ant-design/icons-vue'
import HomeWidget from '../shared/HomeWidget.vue'
import HomeView from './components/HomeView.vue'
import type { HomeInfo } from '../shared/types'
import { useHomeAnnouncements } from './useHomeAnnouncements'
const props = withDefaults(defineProps<{ info?: HomeInfo; isEdit?: boolean }>(), { isEdit: false })
const { isSaas, refreshKey, unreadCount, canOpenAll, openAll, select } = useHomeAnnouncements({ isEdit: () => props.isEdit, info: () => props.info })
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
  line-height: 1;
  color: inherit;
  transition: transform 0.2s ease;
}
</style>
