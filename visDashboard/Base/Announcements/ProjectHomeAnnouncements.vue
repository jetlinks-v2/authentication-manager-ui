<template>
  <HomeWidget feature="Announcements" :info="info" :is-edit="isEdit" :refresh-key="refreshKey" hide-more>
    <template #title-extra>
      <a-badge v-if="isSaas && unreadCount" :count="unreadCount" :overflow-count="99"
        :title="$t('Announcement.inbox.unreadCount', { count: unreadCount > 99 ? '99+' : unreadCount })" />
    </template>
    <template #extra>
      <a-button type="link" size="small" :disabled="!canOpenAll" @click="openAll">{{ $t('packages.ProjectHome.announcementsMore') }} ›</a-button>
    </template>
    <template #default="view"><HomeView v-bind="view" @select="select" /></template>
  </HomeWidget>
</template>
<script setup lang="ts">
import HomeWidget from '../shared/HomeWidget.vue'
import HomeView from './components/HomeView.vue'
import type { HomeInfo } from '../shared/types'
import { useHomeAnnouncements } from './useHomeAnnouncements'
const props = withDefaults(defineProps<{ info?: HomeInfo; isEdit?: boolean }>(), { isEdit: false })
const { isSaas, refreshKey, unreadCount, canOpenAll, openAll, select } = useHomeAnnouncements({ isEdit: () => props.isEdit, info: () => props.info })
</script>
