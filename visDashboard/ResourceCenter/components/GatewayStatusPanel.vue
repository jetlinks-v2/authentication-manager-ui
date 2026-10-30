<template>
  <section v-if="available" class="gateway-status resource-ranking" :aria-label="title">
    <header class="ranking-header">
      <h3>{{ title }}</h3>
      <div class="ranking-toolbar">
        <a-segmented v-if="!tableMode" v-model:value="metric" :options="tabs" size="small" class="ranking-switch" />
        <a-button v-if="canOpenList" type="link" size="small" class="action-link" @click="openList">
          {{ t('resourceDashboard.gatewayStatus.nodeList') }}<RightOutlined class="action-arrow" />
        </a-button>
      </div>
    </header>
    <div v-if="loading" class="state"><a-spin /></div>
    <ResourceEmpty v-else-if="error" class="state" icon="DisconnectOutlined" :title="t('resourceDashboard.loadError')">
      <a-button size="small" @click="refresh">{{ t('resourceDashboard.retry') }}</a-button>
    </ResourceEmpty>
    <ResourceEmpty v-else-if="!nodeCount" class="state" icon="DisconnectOutlined"
      :title="t('resourceDashboard.gatewayStatus.empty')" :description="emptyDescription" />
    <template v-else>
      <div class="ranking-caption"><span>{{ t('resourceDashboard.gatewayStatus.currentValue') }}</span><span>{{ nodeSummary }}</span></div>
      <GatewayNodeTable v-if="tableMode" :rows="tableRows" :columns="tableColumns" :interactive="canOpenGateway" @select="openGateway" />
      <ResourceRankList v-else :rows="rows" :interactive="canOpenGateway" @select="openGateway" />
    </template>
  </section>
</template>
<script setup lang="ts">
import { toRef } from 'vue'
import { RightOutlined } from '@ant-design/icons-vue'
import { useI18n } from 'vue-i18n'
import ResourceEmpty from './ResourceEmpty.vue'
import ResourceRankList from './ResourceRankList.vue'
import GatewayNodeTable from './GatewayNodeTable.vue'
import { useGatewayStatus } from '../hooks/useGatewayStatus'
import type { ResourceInfo } from '../shared'
const props = defineProps<{ info?: ResourceInfo; isEdit: boolean }>()
const emit = defineEmits<{ count: [count: number] }>()
const { t } = useI18n()
const { title, metric, tabs, rows, loading, error, refresh, available, emptyDescription,
  nodeCount, tableMode, tableRows, tableColumns, nodeSummary,
  canOpenList, canOpenGateway, openList, openGateway } = useGatewayStatus(toRef(props, 'info'), toRef(props, 'isEdit'), count => emit('count', count))
</script>
<style scoped src="./resourceRanking.css" />
<style scoped>
.state { flex: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; overflow: auto; }
/* 排名只表达相对大小，条形与前三名序号不再被错误解释为告警阈值。 */
.gateway-status :deep(.track > span) { background: var(--ant-color-primary, #1677ff) !important; }
.gateway-status :deep(.rank-1), .gateway-status :deep(.rank-2), .gateway-status :deep(.rank-3) { background: var(--ant-color-primary, #1677ff); }
.gateway-status :deep(.rank-0) { background: var(--ant-color-fill-secondary, #f2f3f5); color: var(--ant-color-text-tertiary, #bfbfbf); }
</style>
