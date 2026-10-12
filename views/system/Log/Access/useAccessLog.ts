import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ConditionFieldSearchConfig, ConditionFilterChangePayload, ConditionFilterTerm } from '@jetlinks-web-core/components/ConditionFilter';
import { useLogQuery } from '../useLogQuery';
import { useLogInspector } from '../useLogInspector';
import { appendLogFilter } from '../logFilter';
import type { AccessLogRecord } from './accessLogPresentation';

export type AccessLogQuickSearch = { column: 'url' | 'username' | 'traceId'; value: string };

/** 聚合列表筛选元数据与本页详情选择，切换记录不发起额外请求。 */
export const useAccessLog = () => {
    const { t } = useI18n();
    const { params, timeSearch, defaultParams, traceIdColumn } = useLogQuery(t('Log.index.traceId'));
    const inspector = useLogInspector<AccessLogRecord>('access-log-row', 'access-log-detail');
    const filterTerms = ref<ConditionFilterTerm[]>([]);
    const usernameSearch: ConditionFieldSearchConfig = {
        type: 'string',
        rename: 'context.username',
        handleTerms: term => ({
            ...term,
            column: 'context',
            termType: 'json_value',
            value: { path: 'username', termType: term.termType, value: term.value },
        }),
    };
    const columns = computed(() => [
        { title: t('Access.list.source'), key: 'source', dataIndex: 'source', scopedSlots: true, width: 240 },
        { title: t('Access.list.request'), key: 'request', dataIndex: 'request', scopedSlots: true },
        { title: t('Access.index.480752-2'), key: 'operation', dataIndex: 'operation', scopedSlots: true, width: '32%' },
        { title: 'IP', key: 'ip', dataIndex: 'ip', hideInTable: true, search: { type: 'string' } },
        { title: t('Access.index.480752-11'), key: 'url', dataIndex: 'url', hideInTable: true, search: { type: 'string' } },
        { title: t('Access.index.480752-2'), key: 'description', dataIndex: 'description', hideInTable: true, search: { type: 'string', rename: 'action' } },
        {
            title: t('Access.index.480752-1'), key: 'httpMethod', dataIndex: 'httpMethod', hideInTable: true,
            search: { type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'CONNECT', 'TRACE'].map(method => ({ label: method, value: method })) },
        },
        {
            title: t('Access.index.responseStatus'), key: 'responseStatus', dataIndex: 'responseStatus', hideInTable: true,
            search: { type: 'select', options: [200, 400, 401, 403, 404, 500, 502, 503].map(code => ({ label: String(code), value: code })) },
        },
        { title: t('Access.index.480752-5'), key: 'requestTime', dataIndex: 'requestTime', hideInTable: true, search: timeSearch },
        { title: t('Access.index.480752-13'), key: 'username', dataIndex: 'username', hideInTable: true, search: usernameSearch },
        { ...traceIdColumn, title: t('Log.index.traceId') },
    ]);

    const handleSearch = ({ filter }: ConditionFilterChangePayload) => { params.value = filter; };
    // 使用筛选组件的编辑模型，让字段重命名 / JSON 转换、回显与查询只走一条链路。
    const searchSameValue = ({ column, value }: AccessLogQuickSearch) => {
        if (value.trim()) filterTerms.value = appendLogFilter(filterTerms.value, { column, termType: 'eq', value });
    };
    return { columns, params, defaultParams, filterTerms, ...inspector, handleSearch, searchSameValue };
};
