<template>
  <JlDrawerShell
    :open="open"
    :width="980"
    icon="FileSearchOutlined"
    :title="$t('ApiApplication.logs.title')"
    :sub="application?.name"
    @update:open="emit('update:open', $event)"
  >
    <div class="log-toolbar">
      <ConditionFilter :columns="filterColumns" target="api-application-logs" @change="handleSearch" />
      <a-button :loading="exporting" @click="exportLogs">
        <template #icon><AIcon type="DownloadOutlined" /></template>
        {{ $t('ApiApplication.logs.export') }}
      </a-button>
    </div>
    <j-pro-table
      ref="tableRef"
      mode="TABLE"
      :columns="columns"
      :request="requestLogs"
      :params="params"
      :default-params="{ sorts: [{ name: 'requestTime', order: 'desc' }] }"
      :scroll="{ x: 820 }"
    >
      <template #requestTime="slotProps">{{ formatTime(slotProps.requestTime) }}</template>
      <template #duration="slotProps">{{ duration(slotProps) }} ms</template>
      <template #responseStatus="slotProps">
        <a-tag :color="statusColor(slotProps.responseStatus)">{{ slotProps.responseStatus || '-' }}</a-tag>
      </template>
      <template #action="slotProps">
        <a-button type="link" @click="openDetail(slotProps)">{{ $t('ApiApplication.logs.detail') }}</a-button>
      </template>
    </j-pro-table>
    <a-modal v-model:open="detailOpen" :title="$t('ApiApplication.logs.detailTitle')" :width="760" :footer="null">
      <a-descriptions v-if="detail" bordered :column="2" size="small">
        <a-descriptions-item label="URL" :span="2">{{ detail.url || '-' }}</a-descriptions-item>
        <a-descriptions-item :label="$t('ApiApplication.logs.method')">{{ detail.httpMethod || '-' }}</a-descriptions-item>
        <a-descriptions-item label="IP">{{ detail.ip || '-' }}</a-descriptions-item>
        <a-descriptions-item :label="$t('ApiApplication.logs.requestTime')">{{ formatTime(detail.requestTime) }}</a-descriptions-item>
        <a-descriptions-item :label="$t('ApiApplication.logs.duration')">{{ duration(detail) }} ms</a-descriptions-item>
        <a-descriptions-item :label="$t('ApiApplication.logs.headers')" :span="2"><pre>{{ stringify(detail.httpHeaders) }}</pre></a-descriptions-item>
        <a-descriptions-item :label="$t('ApiApplication.logs.parameters')" :span="2"><pre>{{ stringify(detail.parameters) }}</pre></a-descriptions-item>
        <a-descriptions-item v-if="detail.exception" :label="$t('ApiApplication.logs.error')" :span="2"><pre>{{ detail.exception }}</pre></a-descriptions-item>
      </a-descriptions>
    </a-modal>
  </JlDrawerShell>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import dayjs from 'dayjs'
import { useI18n } from 'vue-i18n'
import { queryAccessLogs } from '@authentication-manager-ui/api/application-center/apiApplication'
import type { AccessLog, ApiApplication } from '../types'
import type { ConditionFilterChangePayload, ConditionFilterField } from '@jetlinks-web-core/components/ConditionFilter'

const props = defineProps<{ open: boolean; application?: ApiApplication }>()
const emit = defineEmits<{ (event: 'update:open', value: boolean): void }>()
const { t: $t } = useI18n()
const tableRef = ref<any>()
const params = ref<{ terms: Array<Record<string, unknown>> }>({ terms: [] })
const detail = ref<AccessLog>()
const detailOpen = ref(false)
const exporting = ref(false)

const filterColumns: ConditionFilterField[] = [
  { dataIndex: 'url', title: $t('ApiApplication.logs.url'), search: { type: 'string', defaultTermType: 'like' } },
  { dataIndex: 'httpMethod', title: $t('ApiApplication.logs.method'), search: { type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(value => ({ label: value, value })) } },
  { dataIndex: 'responseStatus', title: $t('ApiApplication.logs.status'), search: { type: 'select', options: [200, 400, 401, 403, 404, 500, 502, 503].map(value => ({ label: String(value), value })) } },
  { dataIndex: 'requestTime', title: $t('ApiApplication.logs.requestTime'), search: { type: 'date' } },
]

const columns = [
  { title: $t('ApiApplication.logs.requestTime'), dataIndex: 'requestTime', key: 'requestTime', scopedSlots: true, width: 180 },
  { title: $t('ApiApplication.logs.method'), dataIndex: 'httpMethod', key: 'httpMethod', width: 90 },
  { title: $t('ApiApplication.logs.url'), dataIndex: 'url', key: 'url', ellipsis: true, width: 300 },
  { title: 'IP', dataIndex: 'ip', key: 'ip', width: 130 },
  { title: $t('ApiApplication.logs.status'), dataIndex: 'responseStatus', key: 'responseStatus', scopedSlots: true, width: 90 },
  { title: $t('ApiApplication.logs.duration'), key: 'duration', scopedSlots: true, width: 100 },
  { title: $t('ApiApplication.logs.action'), key: 'action', scopedSlots: true, fixed: 'right', width: 90 },
]

const requestLogs = (query: Record<string, unknown>) => queryAccessLogs({
  ...query,
  terms: [
    { column: 'context.openApiClientId', termType: 'eq', value: props.application?.id },
    ...((query.terms as Array<Record<string, unknown>>)?.length ? query.terms as Array<Record<string, unknown>> : params.value.terms),
  ],
})

const handleSearch = ({ filter }: ConditionFilterChangePayload) => {
  params.value = { terms: filter.terms as Array<Record<string, unknown>> }
  tableRef.value?.reload()
}

const formatTime = (value?: number) => value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-'
const duration = (value: AccessLog) => Math.max(0, Number(value.responseTime || 0) - Number(value.requestTime || 0))
const statusColor = (status?: number) => !status ? 'default' : status >= 500 ? 'error' : status >= 400 ? 'warning' : 'success'
const stringify = (value: unknown) => typeof value === 'string' ? value : JSON.stringify(value || {}, null, 2)
const openDetail = (value: AccessLog) => { detail.value = value; detailOpen.value = true }

const exportLogs = async () => {
  exporting.value = true
  try {
    const response = await queryAccessLogs({
      paging: false,
      terms: [{ column: 'context.openApiClientId', termType: 'eq', value: props.application?.id }, ...params.value.terms],
    })
    const result = (response as any).result || response
    const rows = Array.isArray(result) ? result : result?.data || []
    const header = ['requestTime', 'httpMethod', 'url', 'ip', 'responseStatus', 'duration']
    const csv = [header, ...rows.map((row: AccessLog) => [
      formatTime(row.requestTime), row.httpMethod || '', row.url || '', row.ip || '', row.responseStatus || '', duration(row),
    ])]
      .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${props.application?.name || 'api-application'}-access-logs.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
.log-toolbar { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-2); }
.log-toolbar :deep(.condition-filter) { flex: 1; min-width: 0; }
pre { max-height: 12rem; margin: 0; overflow: auto; white-space: pre-wrap; word-break: break-word; }
</style>
