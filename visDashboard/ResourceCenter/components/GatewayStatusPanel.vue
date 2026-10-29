<template>
  <section v-if="available" class="gateway-status resource-ranking" :aria-label="title">
    <header class="ranking-header">
      <h3>{{ title }}</h3>
      <div class="ranking-toolbar">
        <a-segmented v-model:value="metric" :options="tabs" size="small" class="ranking-switch" />
        <a-button v-if="canOpenList" type="link" size="small" class="action-link" @click="openList">
          {{ t('resourceDashboard.gatewayStatus.nodeList') }}<RightOutlined class="action-arrow" />
        </a-button>
      </div>
    </header>
    <div v-if="loading" class="state"><a-spin /></div>
    <ResourceEmpty v-else-if="error" class="state" icon="DisconnectOutlined" :title="t('resourceDashboard.loadError')">
      <a-button size="small" @click="refresh">{{ t('resourceDashboard.retry') }}</a-button>
    </ResourceEmpty>
    <ResourceEmpty v-else-if="!rows.length" class="state" icon="DisconnectOutlined"
      :title="t('resourceDashboard.gatewayStatus.empty')" :description="emptyDescription" />
    <ResourceRankList v-else :rows="rows" :interactive="canOpenGateway" @select="openGateway" />
  </section>
</template>
<script setup lang="ts">
import { toRef } from 'vue'
import { RightOutlined } from '@ant-design/icons-vue'
import { useI18n } from 'vue-i18n'
import ResourceEmpty from './ResourceEmpty.vue'
import ResourceRankList from './ResourceRankList.vue'
import { useGatewayStatus } from '../hooks/useGatewayStatus'
import type { ResourceInfo } from '../shared'
const props = defineProps<{ info?: ResourceInfo; isEdit: boolean }>()
const { t } = useI18n()
const { title, metric, tabs, rows, loading, error, refresh, available, emptyDescription,
  canOpenList, canOpenGateway, openList, openGateway } = useGatewayStatus(toRef(props, 'info'), toRef(props, 'isEdit'))
</script>
<style scoped src="./resourceRanking.css" />
<style scoped>
.state { flex: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; overflow: auto; }
</style>
