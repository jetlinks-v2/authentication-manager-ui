import { computed, ref, watch, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLogDetailState } from '../useLogDetailState';
import { decodeParameters, displayText, formatRawValue, getAccessLogSummary, getCommonHeaders, getHeaders, hasParameters, type AccessLogRecord } from './accessLogPresentation';

/** 每条记录的展开状态独立，关闭后重开也从紧凑摘要开始。 */
export const useAccessLogDetail = (record: Ref<AccessLogRecord | undefined>, open: Ref<boolean>) => {
    const { t } = useI18n();
    const allHeaders = ref(false);
    const rawParameters = ref(false);
    const expandedParameters = ref(false);
    const detailState = useLogDetailState(record, open, ['headers', 'parameters', 'exception']);
    const summary = computed(() => getAccessLogSummary(record.value ?? {}));
    const usernameSearchValue = computed(() => typeof record.value?.context?.username === 'string'
        ? record.value.context.username : undefined);
    const headers = computed(() => getHeaders(record.value?.httpHeaders));
    const commonHeaders = computed(() => getCommonHeaders(headers.value));
    const visibleHeaders = computed(() => allHeaders.value ? headers.value : commonHeaders.value);
    const headerFields = computed(() => visibleHeaders.value.map(entry => ({ ...entry, label: entry.name })));
    const parameters = computed(() => decodeParameters(record.value?.parameters));
    const parametersPresent = computed(() => hasParameters(record.value?.parameters));
    const parameterText = computed(() => formatRawValue(record.value?.parameters));
    const exception = computed(() => record.value?.exception?.trim() ? record.value.exception : '');
    const locationFields = computed(() => [
        { label: t('Access.index.480752-3'), value: displayText(record.value?.target) },
        { label: t('Access.index.480752-4'), value: displayText(record.value?.method) },
        { key: 'traceId', label: t('Log.index.traceId'), value: displayText(record.value?.traceId) },
        { label: 'Span ID', value: displayText(record.value?.spanId) },
        { label: t('Access.detail.logId'), value: displayText(record.value?.id) },
    ]);
    watch([record, open], () => {
        allHeaders.value = false;
        rawParameters.value = false;
        expandedParameters.value = false;
    }, { flush: 'sync' });
    return { allHeaders, rawParameters, expandedParameters, ...detailState, sectionKeys: detailState.expandedKeys,
        summary, usernameSearchValue, headers, commonHeaders, headerFields, parameters, parameterText, parametersPresent, exception, locationFields };
};
