<template>
  <HomeWidget feature="SaasQuotas" :info="info" :is-edit="isEdit">
    <template #extra="{ rows }">
      <a-button type="link" size="small" @click="open(rows)">{{ $t('packages.ProjectHome.saasExpansion') }}</a-button>
    </template>
    <template #default="view"><QuotaOverview :rows="view.rows" :can-open="view.canOpen" @navigate="view.open" /></template>
  </HomeWidget>
  <QuotaExpansionDialog v-if="visible" :view="view" @change="change" @submit="submit" @close="close" />
</template>
<script setup lang="ts">
import HomeWidget from '../shared/HomeWidget.vue'
import QuotaOverview from './components/QuotaOverview.vue'
import QuotaExpansionDialog from './components/QuotaExpansionDialog.vue'
import { useQuotaExpansion } from './useQuotaExpansion'
import type { HomeInfo } from '../shared/types'
const props = withDefaults(defineProps<{ info?: HomeInfo; isEdit?: boolean }>(), { isEdit: false })
const { visible, view, open, close, change, submit } = useQuotaExpansion(() => props.isEdit)
</script>
