import { ref } from 'vue';
import dayjs from 'dayjs';
import type {
    ConditionFieldSearchConfig,
    ConditionFilterChangePayload,
} from '@jetlinks-web-core/components/ConditionFilter';

/** 统一日志页的今日默认筛选和排序，保证表格首次请求也带时间范围。 */
export const useLogQuery = (traceIdTitle: string) => {
    const today = dayjs();
    const timeSearch: ConditionFieldSearchConfig = {
        type: 'date',
        rename: 'timestamp',
        defaultTermType: 'btw',
        defaultValue: [today.startOf('day').valueOf(), today.endOf('day').valueOf()],
    };
    const params = ref<ConditionFilterChangePayload['filter']>({
        terms: [{
            column: timeSearch.rename,
            termType: timeSearch.defaultTermType,
            value: timeSearch.defaultValue,
        }],
    });
    const defaultParams = {
        sorts: [{ name: 'timestamp', order: 'desc' }],
    };
    const traceIdColumn = {
        title: traceIdTitle,
        dataIndex: 'traceId',
        key: 'traceId',
        hideInTable: true,
        search: {
            type: 'string',
            defaultTermType: 'eq',
        },
    };

    return { params, timeSearch, defaultParams, traceIdColumn };
};
