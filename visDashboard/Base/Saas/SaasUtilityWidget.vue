<template>
  <a-card class="saas-utility-card" :bordered="false" :title="$t(`packages.ProjectHome.${info?.type === 'projectHomeSaasHelp' ? 'SaasHelp' : 'saasQuickActions'}`)">
    <template v-if="info?.type === 'projectHomeSaasHelp'" #extra>
      <a-button type="link" size="small" @click="openHelpCenter">{{ $t('packages.ProjectHome.saasHelpCenter') }} ›</a-button>
    </template>
    <HelpDocuments v-if="info?.type === 'projectHomeSaasHelp'" :documents="documents" @open="openHelp" />
    <QuickActions v-else-if="rows.length" :rows="rows" :chart="chart" :can-open="canOpen" @navigate="open" />
    <a-empty v-else :description="$t('packages.ProjectHome.saasNoActions')" />
  </a-card>
</template>
<script setup lang="ts">
import HelpDocuments from './components/HelpDocuments.vue'
import QuickActions from '../QuickActions/components/HomeView.vue'
import { useSaasUtilities } from './useSaasUtilities'
import type { HomeInfo } from '../shared/types'
const props = withDefaults(defineProps<{ info?: HomeInfo & { type?: string }; isEdit?: boolean }>(), { isEdit: false })
const { rows, documents, chart, canOpen, open, openHelp, openHelpCenter } = useSaasUtilities(() => props.isEdit)
</script>
<style scoped lang="less">
.saas-utility-card { height: auto; min-height: 0; display: flex; flex-direction: column; border-radius: var(--r-3, 8px); container-name: project-home; container-type: inline-size; }
.saas-utility-card :deep(.ant-card-head) { flex-shrink: 0; min-height: 46px; border-bottom: 1px solid var(--line, #f2f3f5); padding: 0 18px; font-size: 15px; }
.saas-utility-card :deep(.ant-card-head-title) { padding: 0; line-height: 22px; font-weight: 600; }
.saas-utility-card :deep(.ant-card-extra .ant-btn) { padding: 0; height: auto; font-size: 13px; line-height: 20px; color: #83899f; transition: color .2s; }
.saas-utility-card :deep(.ant-card-extra .ant-btn:hover) { color: var(--business-component-primary, #1677ff); }
.saas-utility-card :deep(.ant-card-body) { flex: 1; min-height: 0; padding: 14px 18px 18px; }
</style>
