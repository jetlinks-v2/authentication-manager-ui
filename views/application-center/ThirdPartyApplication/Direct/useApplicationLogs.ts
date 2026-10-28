import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { buildQueryFilter } from '@jetlinks-web-core/components/ConditionFilter'
import type { ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter'
import { queryAccess } from '@authentication-manager-ui/api/log'
import type { ApiApplication } from '@authentication-manager-ui/api/application-center/apiApplication'
import { useAccessLog } from '../../../system/Log/Access/useAccessLog'
import { displayText, formatDuration, formatRequestTime } from '../../../system/Log/Access/accessLogPresentation'
import type { AccessLogRecord } from '../../../system/Log/Access/accessLogPresentation'
import type { ApplicationLogFilter } from './accessDebugUtils'

type LogQuery = ConditionFilterChangePayload['filter'] & { pageIndex?: number; pageSize?: number }
type RequestFailure = { status?: number; code?: number; response?: { status?: number } }

export const useApplicationLogs = (context: { application: ApiApplication; initialFilter?: ApplicationLogFilter }) => {
  const { t } = useI18n()
  const logs = useAccessLog()
  const applicationId = computed(() => context.application.id?.trim() || '')
  const columns = computed(() => [
    { title: t('Access.index.480752-5'), key: 'requestTime', dataIndex: 'requestTime', width: 190,
      customRender: ({ record }: { record: AccessLogRecord }) => formatRequestTime(record.requestTime) },
    { title: t('Access.list.request'), key: 'request', dataIndex: 'url', scopedSlots: true },
    { title: t('Access.index.responseStatus'), key: 'responseStatus', dataIndex: 'responseStatus', scopedSlots: true, width: 160 },
    { title: t('Access.index.480752-6'), key: 'duration', width: 100,
      customRender: ({ record }: { record: AccessLogRecord }) => formatDuration(record) },
    { title: 'IP', key: 'ip', dataIndex: 'ip', scopedSlots: true, width: 160 },
    { title: t('Access.index.480752-2'), key: 'action', dataIndex: 'action', width: 200, ellipsis: true,
      customRender: ({ record }: { record: AccessLogRecord }) => displayText(record.action) },
  ])
  const tableRef = ref<{ reload: () => void }>()
  const pending = ref(false)
  const error = ref('')

  if (context.initialFilter) {
    const filter = context.initialFilter
    logs.filterTerms.value = [
      { column: 'requestTime', termType: 'btw', value: filter.timeRange },
      { column: 'url', termType: 'like', value: `%${filter.path}%`, type: 'and' },
      { column: 'httpMethod', termType: 'eq', value: filter.method, type: 'and' },
    ]
    logs.params.value = buildQueryFilter(logs.filterTerms.value, logs.columns.value)
  }

  const query = async (params: LogQuery, context?: { signal: AbortSignal }) => {
    if (!applicationId.value) throw new Error(t('ThirdPartyApplication.logs.missingApplication'))
    error.value = ''
    pending.value = true
    logs.open.value = false
    try {
      return await queryAccess({
        ...params,
        // 用户条件整体与应用归属作 AND，避免其中的 OR 放宽固定查询范围。
        terms: [
          { column: 'context', termType: 'json_value', value: { path: 'applicationId', termType: 'eq', value: applicationId.value } },
          ...(params.terms.length ? [{ type: 'and', terms: params.terms }] : []),
        ],
      }, context)
    } finally {
      if (!context?.signal.aborted) pending.value = false
    }
  }

  const handleRequestError = (cause: unknown) => {
    const failure = cause as RequestFailure | undefined
    const status = Number(failure?.response?.status ?? failure?.status ?? failure?.code)
    error.value = status === 403
      ? t('ThirdPartyApplication.logs.forbidden')
      : t('ThirdPartyApplication.logs.loadFailed')
  }
  const refresh = () => tableRef.value?.reload()

  return { ...logs, columns, filterColumns: logs.columns, applicationId, tableRef, pending, error, query, refresh, handleRequestError }
}
