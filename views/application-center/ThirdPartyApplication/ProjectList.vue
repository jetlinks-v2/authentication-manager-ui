<template>
  <j-page-container>
    <div class="third-party-page">
      <div class="page-head">
        <div><h1>{{ $t('ThirdPartyApplication.title') }}</h1><p>{{ $t('ThirdPartyApplication.project.subtitle') }}</p></div>
        <a-space>
          <a-button :loading="loading" @click="load">{{ $t('ThirdPartyApplication.project.refresh') }}</a-button>
          <a-button type="primary" :disabled="!!contextError || loading || !!error || !!catalogError || !connectOptions.length" @click="connectOpen = true">
            <template #icon><AIcon type="PlusOutlined" /></template>{{ $t('ThirdPartyApplication.project.connect') }}
          </a-button>
        </a-space>
      </div>
      <a-alert v-if="contextError" type="warning" show-icon :message="$t(contextError)" class="page-alert" />
      <template v-else>
        <a-alert v-if="error" type="error" show-icon :message="error" class="page-alert" />
        <a-alert v-if="catalogError" type="error" show-icon :message="$t('ThirdPartyApplication.project.catalogError')" :description="catalogError" class="page-alert" />
        <div class="list-search"><a-input-search v-model:value="search" allow-clear :placeholder="$t('ThirdPartyApplication.project.search')" /></div>
        <a-table :data-source="rows" :columns="columns" row-key="id" :loading="loading" :pagination="{ pageSize: 10, showSizeChanger: true }" :scroll="{ x: 950 }">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <a-button type="link" @click="openDetail(record)">{{ nameOf(record) }}</a-button>
              <div v-if="!applications.some(app => app.appId === record.appId)" class="approval-note">{{ $t('ThirdPartyApplication.project.approvalUnavailable') }}</div>
            </template>
            <a-typography-text v-else-if="column.key === 'id'" copyable :content="record.id">{{ record.id }}</a-typography-text>
            <a-badge v-else-if="column.key === 'state'" :status="integrationState(record.state) === 'enabled' ? 'success' : 'default'" :text="integrationStateLabel(record, $t)" />
            <template v-else-if="column.key === 'createTime'">{{ formatTime(record.createTime) }}</template>
            <a-space v-else-if="column.key === 'action'" :size="0">
              <a-button type="link" @click="openDetail(record)">{{ $t('ThirdPartyApplication.detail') }}</a-button>
              <a-button v-if="integrationState(record.state) === 'enabled'" type="link" @click="openAction(record, 'disabled')">{{ $t('ThirdPartyApplication.project.action.disabled') }}</a-button>
              <a-button type="link" danger @click="openAction(record, 'removed')">{{ $t('ThirdPartyApplication.project.action.removed') }}</a-button>
            </a-space>
          </template>
          <template #emptyText><a-empty :description="$t(error ? 'ThirdPartyApplication.project.listUnavailable' : 'ThirdPartyApplication.project.empty')" /></template>
        </a-table>
      </template>
    </div>
    <ConnectApplication v-if="connectOpen" v-model:open="connectOpen" :project-id="projectId" :applications="connectOptions" :runtime-ready="hasRuntimeContext" @saved="load" />
    <IntegrationStateModal :action="action" @close="action = undefined" @saved="load" />
  </j-page-container>
</template>
<script setup lang="ts" name="ProjectThirdPartyApplications">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useThirdPartyApplications } from './useThirdPartyApplications'
import { formatTime, integrationState, integrationStateLabel } from './integrationUtils'
import ConnectApplication from './components/ConnectApplication.vue'
import IntegrationStateModal from './components/IntegrationStateModal.vue'
const { t: $t } = useI18n()
const { contextError, projectId, hasRuntimeContext, rows, applications, loading, error, catalogError, search,
  connectOpen, connectOptions, action, nameOf, load, openDetail, openAction } = useThirdPartyApplications()
const columns = computed(() => [
  { title: $t('ThirdPartyApplication.name'), key: 'name', width: 240 },
  { title: $t('ThirdPartyApplication.project.integrationId'), key: 'id', width: 220 },
  { title: $t('ThirdPartyApplication.project.environment'), key: 'environment', dataIndex: 'environment', width: 110 },
  { title: $t('ThirdPartyApplication.project.integrationState'), key: 'state', width: 110 },
  { title: $t('ApiApplication.columns.createTime'), key: 'createTime', width: 175 },
  { title: $t('ApiApplication.columns.action'), key: 'action', width: 200 },
])
</script>
<style scoped>
.third-party-page { min-height: 100%; padding: var(--space-4); background: var(--bg); }
.page-head { display: flex; justify-content: space-between; align-items: center; gap: var(--space-4); margin-bottom: var(--space-3); }
.page-head h1 { margin: 0; font-size: var(--fs-20); color: var(--ink-1); }.page-head p { margin: 4px 0 0; color: var(--ink-4); }
.page-alert { margin-bottom: 16px; }.list-search { max-width: 420px; margin-bottom: 16px; }.approval-note { font-size: var(--fs-12); color: var(--ink-4); }
@media (max-width: 720px) { .page-head { flex-direction: column; align-items: flex-start; } }
</style>
