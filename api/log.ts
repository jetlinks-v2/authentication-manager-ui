import { request } from '@jetlinks-web/core'

export const queryAccess = (data: object) =>
    request.post(`/logger/access/_query`, data);

export const querySystem = (data: object) =>
    request.post(`/logger/system/_query`, data);

export type LogExportType = 'access' | 'system';
export type LogExportFormat = 'csv' | 'xlsx';

/** 按查询条件导出日志文件。 */
export const exportLog = (
    type: LogExportType,
    data: object,
    format: LogExportFormat = 'xlsx',
) => request.post(`/logger/${type}/download.${format}/_query`, data, { responseType: 'blob' });
