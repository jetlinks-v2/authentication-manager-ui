<template>
  <ContentPanel fill :padding="0" :background="false" class="application-logs">
    <p class="scope-hint">{{ $t('ThirdPartyApplication.logs.scopeHint') }}</p>
    <ConditionFilter v-if="applicationId" v-model="filterTerms" class="logs-filter" :columns="filterColumns"
      target="third-party-application-access" @change="handleSearch" />
    <a-alert v-if="error" type="error" show-icon :message="error" />
    <CloudEmpty v-if="!applicationId" :description="$t('ThirdPartyApplication.logs.missingApplication')" />
    <j-pro-table v-else v-show="!error" mode="TABLE" class="pro-table__no-padding application-log-table"
      :columns="columns" :request="query" :default-params="defaultParams" :params="params"
      :custom-row="customRow" :row-class-name="rowClassName" :scroll="{ x: 1160 }" @request-error="handleRequestError">
      <template #emptyText><CloudEmpty :description="$t('ThirdPartyApplication.logs.empty')" /></template>
      <template #requestTime="record">{{ formatRequestTime(record.requestTime) }}</template>
      <template #duration="record">{{ formatDuration(record) }}</template>
      <template #action="record">{{ displayText(record.action) }}</template>
      <template #request="record">
        <div class="request-line">
          <a-tag class="http-method">{{ record.httpMethod || '-' }}</a-tag>
          <a-button type="link" class="request-path" :title="record.url"
            @click.stop="handleRecordClick(record, $event)">{{ record.url || '-' }}</a-button>
        </div>
      </template>
      <template #responseStatus="record"><HttpStatusBadge :value="record.responseStatus" /></template>
      <template #ip="record"><a-tooltip :title="record.ip"><span class="ip-address">{{ getPrimaryIp(record.ip) }}</span></a-tooltip></template>
    </j-pro-table>
    <AccessLogDetail v-model:open="open" :record="selected" @search="searchSameValue" />
  </ContentPanel>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ApiApplication } from '@authentication-manager-ui/api/application-center/apiApplication'
import HttpStatusBadge from '../../../system/Log/Access/components/HttpStatusBadge.vue'
import { displayText, formatDuration, formatRequestTime, getPrimaryIp } from '../../../system/Log/Access/accessLogPresentation'
import AccessLogDetail from '../../../system/Log/Access/components/AccessLogDetail.vue'
import { useApplicationLogs } from './useApplicationLogs'
import type { ApplicationLogFilter } from './accessDebugUtils'

const props = defineProps<{ application: ApiApplication; initialFilter?: ApplicationLogFilter }>()
const { t: $t } = useI18n()
const { applicationId, columns, filterColumns, params, defaultParams, filterTerms, error,
  open, selected, customRow, rowClassName, query, handleSearch, handleRecordClick,
  searchSameValue, handleRequestError } = useApplicationLogs(props)
</script>

<style scoped>
.application-logs { min-width: 0; gap: var(--space-3); }
.scope-hint { margin: 0; color: var(--ink-3); font-size: var(--fs-14); line-height: 1.6; }
.logs-filter { flex: none; min-width: 0; margin: 0; }
.application-log-table { min-width: 0; }
.application-log-table :deep(.access-log-row) { cursor: pointer; }
.request-line { display: flex; align-items: center; gap: var(--space-2); min-width: 0; }
.http-method { flex: none; margin: 0; font-family: var(--font-mono, monospace); }
.request-path { min-width: 0; max-width: 100%; height: auto; padding: 0; }
.request-path :deep(span) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ip-address { font-family: var(--font-mono, monospace); }
</style>
