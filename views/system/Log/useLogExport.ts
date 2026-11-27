import { exportLog, type LogExportType } from '@authentication-manager-ui/api/log';
import { downloadBlob } from '@jetlinks-web/utils';
import { computed, ref } from 'vue';

type LogTable = { dataSource: { id: string }[] };

export const useLogExport = (
    type: LogExportType,
    fileName: string,
    sorts: { name: string; order: string }[],
) => {
    const tableRef = ref<LogTable>();
    const exporting = ref(false);
    const currentPageIds = computed(() =>
        tableRef.value?.dataSource.map(({ id }) => id).filter(Boolean) ?? [],
    );
    const canExport = computed(() => currentPageIds.value.length > 0);

    const handleExport = async () => {
        const ids = currentPageIds.value;
        if (exporting.value || !ids.length) return;

        exporting.value = true;
        try {
            // 下载接口忽略分页参数，按表格已加载的日志 ID 限定导出范围。
            const file = await exportLog(type, {
                sorts,
                terms: [{ column: 'id', termType: 'in', value: ids }],
            });
            downloadBlob(file, fileName, 'xlsx');
        } finally {
            exporting.value = false;
        }
    };

    return {
        tableRef,
        canExport,
        exporting,
        handleExport,
    };
};
