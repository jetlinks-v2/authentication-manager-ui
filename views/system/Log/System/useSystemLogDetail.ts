import { computed, ref, watch, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { displayText } from '../logPresentation';
import { useLogDetailState } from '../useLogDetailState';
import { getCommonSystemLogContext, getSystemLogContext, getSystemLogSummary, type SystemLogRecord } from './systemLogPresentation';

/** 详情只派生当前记录，原文、上下文及展开状态不写回列表数据。 */
export const useSystemLogDetail = (record: Ref<SystemLogRecord | undefined>, open: Ref<boolean>) => {
    const { t } = useI18n();
    const detailState = useLogDetailState(record, open, ['message', 'exception', 'context']);
    const allContext = ref(false);
    const summary = computed(() => getSystemLogSummary(record.value ?? {}));
    const context = computed(() => getSystemLogContext(record.value?.context));
    const commonContext = computed(() => getCommonSystemLogContext(context.value));
    const visibleContext = computed(() => {
        const labels: Record<string, string> = {
            server: t('System.index.112006-5'), username: t('System.detail.username'), userId: t('System.detail.userId'),
        };
        return (allContext.value ? context.value : commonContext.value)
            .map(entry => ({ ...entry, label: Object.hasOwn(labels, entry.name) ? labels[entry.name] : entry.name }));
    });
    const locationFields = computed(() => [
        { label: t('System.index.112006-2'), value: displayText(record.value?.name) },
        { label: t('System.detail.className'), value: displayText(record.value?.className) },
        { label: t('System.detail.methodName'), value: displayText(record.value?.methodName) },
        { label: t('System.detail.lineNumber'), value: typeof record.value?.lineNumber === 'number'
            && Number.isInteger(record.value.lineNumber) && record.value.lineNumber > 0 ? String(record.value.lineNumber) : '-' },
        { label: t('System.detail.threadName'), value: displayText(record.value?.threadName) },
        { label: t('System.detail.threadId'), value: displayText(record.value?.threadId) },
        { label: t('Log.index.traceId'), value: displayText(record.value?.traceId) },
        { label: 'Span ID', value: displayText(record.value?.spanId) },
        { label: t('System.detail.logId'), value: displayText(record.value?.id) },
    ]);
    // 每次切换与重开均回到常用上下文，滚动与定位折叠由共享 hook 同步复位。
    watch([record, open], () => { allContext.value = false; }, { flush: 'sync' });
    return { ...detailState, sectionKeys: detailState.expandedKeys, allContext, summary, context, commonContext, visibleContext, locationFields };
};
