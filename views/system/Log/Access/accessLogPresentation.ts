import type { AccessLogItem } from '../typings';
import { displayText, formatLogTime, formatRawValue, isObjectRecord } from '../logPresentation';
export { displayText, formatRawValue, isObjectRecord } from '../logPresentation';

export type AccessLogRecord = Partial<AccessLogItem>;
export type HeaderEntry = { name: string; value: string };
export type SourceKind = 'loopback' | 'private' | 'unknown';

const commonHeaderNames = [
    'host', 'content-type', 'content-length', 'accept',
    'traceparent', 'x-request-id', 'x-forwarded-for',
];
const statusReasons: Record<number, string> = {
    100: 'Continue', 101: 'Switching Protocols', 102: 'Processing', 103: 'Early Hints',
    200: 'OK', 201: 'Created', 202: 'Accepted', 203: 'Non-Authoritative Information',
    204: 'No Content', 205: 'Reset Content', 206: 'Partial Content', 207: 'Multi-Status',
    300: 'Multiple Choices', 301: 'Moved Permanently', 302: 'Found', 303: 'See Other',
    304: 'Not Modified', 307: 'Temporary Redirect', 308: 'Permanent Redirect',
    400: 'Bad Request', 401: 'Unauthorized', 402: 'Payment Required', 403: 'Forbidden',
    404: 'Not Found', 405: 'Method Not Allowed', 406: 'Not Acceptable',
    408: 'Request Timeout', 409: 'Conflict', 410: 'Gone', 412: 'Precondition Failed',
    413: 'Content Too Large', 414: 'URI Too Long', 415: 'Unsupported Media Type',
    422: 'Unprocessable Content', 429: 'Too Many Requests',
    500: 'Internal Server Error', 501: 'Not Implemented', 502: 'Bad Gateway',
    503: 'Service Unavailable', 504: 'Gateway Timeout', 505: 'HTTP Version Not Supported',
};

/** HTTP 标准状态码按类别呈现；历史缺失或非法值保持中性。 */
export const getHttpStatus = (value: unknown) => {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 100 || value > 599) {
        return { label: '-', color: 'default', icon: 'QuestionCircleOutlined' };
    }
    const color = value >= 500 ? 'error' : value >= 400 ? 'warning'
        : value >= 300 || value < 200 ? 'processing' : 'success';
    const icon = value >= 400 ? 'ExclamationCircleOutlined'
        : value >= 300 || value < 200 ? 'InfoCircleOutlined' : 'CheckCircleOutlined';
    return { label: [value, statusReasons[value]].filter(Boolean).join(' '), color, icon };
};

/** 只接受真实时间戳，避免缺失数据被格式化成当前时间或 epoch。 */
export const formatRequestTime = (value: unknown): string => formatLogTime(value);

/** responseTime 是响应时间戳，不是耗时；无效或逆序时间不能用于计算。 */
export const formatDuration = (record: AccessLogRecord): string => {
    const { requestTime, responseTime } = record;
    if (typeof requestTime !== 'number' || typeof responseTime !== 'number'
        || !Number.isFinite(requestTime) || !Number.isFinite(responseTime)
        || requestTime <= 0 || responseTime < requestTime) return '-';
    return `${responseTime - requestTime} ms`;
};

/** HTTP 来源地址链以逗号分隔；列表只展示首个地址，原文留作 Tooltip 和详情。 */
export const getPrimaryIp = (value: unknown): string =>
    typeof value === 'string' ? value.split(',').find(ip => ip.trim())?.trim() || '-' : '-';

/** 仅简写列表中的类名；完整 Java 定位信息仍由记录保留。 */
export const formatHandler = (record: AccessLogRecord, short = true): string => {
    const target = displayText(record.target);
    const className = short && target !== '-' ? target.split('.').pop() : target;
    return [className, record.method].filter(value => value && value !== '-').join('#') || '-';
};

const classifyIPv4 = (ip: string): SourceKind => {
    const parts = ip.split('.');
    if (parts.length !== 4 || parts.some(part => !/^\d{1,3}$/.test(part) || Number(part) > 255)) {
        return 'unknown';
    }
    const [first, second] = parts.map(Number);
    if (first === 127) return 'loopback';
    if (first === 10 || (first === 172 && second >= 16 && second <= 31)
        || (first === 192 && second === 168) || (first === 169 && second === 254)) return 'private';
    return 'unknown';
};

/** 属地缺失时只识别可确定的地址范围；支持 IPv6 与 IPv4-mapped IPv6。 */
export const getSourceKind = (value: unknown): SourceKind => {
    if (typeof value !== 'string') return 'unknown';
    const ip = value.trim();
    if (!ip.includes(':')) return classifyIPv4(ip);
    try {
        const canonical = new URL(`http://[${ip}]/`).hostname.slice(1, -1);
        if (canonical === '::1') return 'loopback';
        const mapped = canonical.match(/^::ffff:([\da-f]+):([\da-f]+)$/i);
        if (mapped) {
            const high = parseInt(mapped[1], 16);
            const low = parseInt(mapped[2], 16);
            return classifyIPv4([high >> 8, high & 255, low >> 8, low & 255].join('.'));
        }
        const first = parseInt(canonical.split(':')[0], 16);
        if ((first >= 0xfc00 && first <= 0xfdff) || (first >= 0xfe80 && first <= 0xfebf)) {
            return 'private';
        }
    } catch {
        // 不是有效 IPv6 时不推断来源，仍展示原始地址。
    }
    return 'unknown';
};

/** 参数值可能是 JSON 编码的对象或数组；普通标量字符串保留原值。 */
export const decodeParameters = (value: unknown, depth = 0): unknown => {
    if (depth >= 32) return value;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
                const parsed: unknown = JSON.parse(trimmed);
                if (parsed !== null && typeof parsed === 'object') {
                    return decodeParameters(parsed, depth + 1);
                }
            } catch {
                // 截断标记和无效 JSON 必须按原始文本展示。
            }
        }
        return value;
    }
    if (Array.isArray(value)) return value.map(item => decodeParameters(item, depth + 1));
    if (isObjectRecord(value)) {
        return Object.fromEntries(Object.entries(value).map(([key, item]) =>
            [key, decodeParameters(item, depth + 1)]));
    }
    return value;
};

/** 不改写 Header 名称或值，常用预览按大小写不敏感的优先级选取。 */
export const getHeaders = (value: unknown): HeaderEntry[] =>
    isObjectRecord(value) ? Object.entries(value).map(([name, item]) => ({
        name, value: typeof item === 'string' ? item : formatRawValue(item),
    })) : [];

export const getCommonHeaders = (headers: HeaderEntry[]): HeaderEntry[] =>
    commonHeaderNames.flatMap(name => headers.filter(header => header.name.toLowerCase() === name)).slice(0, 5);

export const hasParameters = (value: unknown): boolean =>
    value !== undefined && value !== null && value !== ''
    && (!isObjectRecord(value) || Object.keys(value).length > 0);

/** 列表与详情共用同一展示口径，原记录保持不变。 */
export const getAccessLogSummary = (record: AccessLogRecord) => ({
    httpMethod: displayText(record.httpMethod).toUpperCase(),
    url: displayText(record.url),
    action: displayText(record.action),
    username: displayText(record.context?.username),
    ip: displayText(record.ip),
    primaryIp: getPrimaryIp(record.ip),
    region: displayText(record.ipRegion),
    sourceKind: getSourceKind(getPrimaryIp(record.ip)),
    time: formatRequestTime(record.requestTime),
    duration: formatDuration(record),
    handler: formatHandler(record),
    fullHandler: formatHandler(record, false),
});
