import dayjs from 'dayjs';

export const displayText = (value: unknown): string =>
    typeof value === 'string' && value.trim() ? value : '-';

export const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value);

/** 缺失或非法时间不能格式化成当前时间，历史字段回退也使用同一判定。 */
export const isLogTimestamp = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value > 0 && dayjs(value).isValid();

export const formatLogTime = (value: unknown, format = 'YYYY-MM-DD HH:mm:ss'): string =>
    isLogTimestamp(value) ? dayjs(value).format(format) : '-';

/** 保留已采集字符串原文，JSON 上下文与参数值仅转换为可读文本。 */
export const formatRawValue = (value: unknown): string =>
    typeof value === 'string' ? value : JSON.stringify(value, null, 2) ?? '-';
