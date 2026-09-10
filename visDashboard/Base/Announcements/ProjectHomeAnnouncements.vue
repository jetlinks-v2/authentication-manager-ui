<template>
  <HomeWidget feature="Announcements" :info="info" :is-edit="isEdit">
    <template #default="view"><HomeView v-bind="view" @select="select" /></template>
  </HomeWidget>
  <a-modal :open="!!selected" :title="selected?.label" :footer="null" :width="754" @cancel="selected = undefined" destroy-on-close>
    <component v-if="selected && detailComponent" :is="detailComponent" :data="selected.notification" />
    <a-empty v-else :description="$t('Announcement.notification.unavailable')" />
  </a-modal>
</template>
<script setup lang="ts">
import { ref, type Component } from 'vue'
import { moduleRegistry } from '@jetlinks-web-core/utils/module-registry'
import HomeWidget from '../shared/HomeWidget.vue'
import HomeView from './components/HomeView.vue'
import type { HomeInfo, HomeRow } from '../shared/types'
const props = withDefaults(defineProps<{ info?: HomeInfo; isEdit?: boolean }>(), { isEdit: false })
const selected = ref<HomeRow>()
const components = moduleRegistry.getResource('authentication-manager-ui', 'components') as { SystemBulletinNotificationDetail?: Component }
const detailComponent = components?.SystemBulletinNotificationDetail
const select = (row: HomeRow) => { if (!props.isEdit) selected.value = row }
</script>
