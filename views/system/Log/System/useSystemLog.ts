import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ConditionFilterChangePayload } from '@jetlinks-web-core/components/ConditionFilter';
import { useLogQuery } from '../useLogQuery';
import { useLogInspector } from '../useLogInspector';
import { systemLogLevels, type SystemLogRecord } from './systemLogPresentation';

/** 三列摘要与筛选字段分别定义，服务上下文仅展示，不提交未支持的通用搜索。 */
export const useSystemLog = () => {
    const { t } = useI18n();
    const { params, timeSearch, defaultParams, traceIdColumn } = useLogQuery(t('Log.index.traceId'));
    const inspector = useLogInspector<SystemLogRecord>('system-log-row', 'system-log-detail');
    const columns = computed(() => [
        { title: t('System.index.112006-6'), key: 'time', dataIndex: 'time', scopedSlots: true, width: 160 },
        { title: t('System.index.112006-4'), key: 'log', dataIndex: 'log', scopedSlots: true },
        { title: t('System.list.source'), key: 'source', dataIndex: 'source', scopedSlots: true, width: 260 },
        { title: t('System.index.112006-6'), key: 'timestamp', dataIndex: 'timestamp', hideInTable: true, search: timeSearch },
        {
            title: t('System.index.112006-3'), key: 'level', dataIndex: 'level', hideInTable: true,
            search: { type: 'select', options: systemLogLevels.map(value => ({ label: value, value })) },
        },
        { title: t('System.index.112006-4'), key: 'message', dataIndex: 'message', hideInTable: true, search: { type: 'string' } },
        { ...traceIdColumn, title: t('Log.index.traceId') },
        { title: t('System.index.112006-2'), key: 'name', dataIndex: 'name', hideInTable: true, search: { type: 'string' } },
        { title: t('System.detail.className'), key: 'className', dataIndex: 'className', hideInTable: true, search: { type: 'string' } },
        { title: t('System.detail.methodName'), key: 'methodName', dataIndex: 'methodName', hideInTable: true, search: { type: 'string' } },
        { title: t('System.detail.threadName'), key: 'threadName', dataIndex: 'threadName', hideInTable: true, search: { type: 'string' } },
        { title: t('System.detail.exception'), key: 'exceptionStack', dataIndex: 'exceptionStack', hideInTable: true, search: { type: 'string' } },
    ]);
    const handleSearch = ({ filter }: ConditionFilterChangePayload) => { params.value = filter; };
    return { columns, params, defaultParams, ...inspector, handleSearch };
};
