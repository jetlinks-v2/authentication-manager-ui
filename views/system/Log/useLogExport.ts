import { exportLog, type LogExportType } from '@authentication-manager-ui/api/log';
import { downloadBlob } from '@jetlinks-web/utils';

type QueryParamsGetter = () => Record<string, any>;

/**
 * 复用日志导出状态，并确保导出条件与当前列表查询保持一致。
 */
export const useLogExport = (
    type: LogExportType,
    fileName: string,
    getQueryParams: QueryParamsGetter,
) => {
    const exporting = ref(false);

    const handleExport = async () => {
        exporting.value = true;
        try {
            const file = await exportLog(type, getQueryParams());
            downloadBlob(file, fileName, 'xlsx');
        } finally {
            exporting.value = false;
        }
    };

    return {
        exporting,
        handleExport,
    };
};
