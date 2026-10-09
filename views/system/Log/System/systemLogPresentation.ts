import type { SystemLogItem } from '../typings';
import { displayText, formatLogTime, formatRawValue, isLogTimestamp, isObjectRecord } from '../logPresentation';

export type SystemLogRecord = Partial<SystemLogItem>;
export type ContextEntry = { name: string; value: string };
export const systemLogLevels = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'] as const;
const levelStyles: Record<string, { color: string; icon: string }> = {
    ERROR: { color: 'error', icon: 'ExclamationCircleOutlined' },
    WARN: { color: 'warning', icon: 'WarningOutlined' },
    INFO: { color: 'processing', icon: 'InfoCircleOutlined' },
    DEBUG: { color: 'default', icon: 'BugOutlined' },
    TRACE: { color: 'default', icon: 'NodeIndexOutlined' },
};
const commonContextNames = ['username', 'userId', 'server'];

/** 未知级别保持原标识与中性样式，不将历史值推断为 INFO 或成功。 */
export const getSystemLogLevel = (value: unknown) => {
    const label = displayText(value).trim().toUpperCase();
    return { label, ...(levelStyles[label] ?? { color: 'default', icon: 'QuestionCircleOutlined' }) };
};

/** 调用位置与 Logger 是不同字段；缺失类名、方法或有效行号时不拼造信息。 */
export const formatSystemLogLocation = (record: SystemLogRecord, short = true): string => {
    const className = displayText(record.className);
    const target = short && className !== '-' ? className.split('.').pop() : className;
    const method = displayText(record.methodName);
    const location = [target, method].filter(value => value && value !== '-').join('#');
    if (!location) return '-';
    const line = record.lineNumber;
    return typeof line === 'number' && Number.isInteger(line) && line > 0 ? `${location}:${line}` : location;
};

/** 上下文值来自静态配置与 MDC，缺失或旧格式保持空态，仅格式化已采集值。 */
export const getSystemLogContext = (value: unknown): ContextEntry[] =>
    isObjectRecord(value) ? Object.entries(value).map(([name, item]) => ({ name, value: formatRawValue(item) })) : [];

export const getCommonSystemLogContext = (entries: ContextEntry[]): ContextEntry[] =>
    commonContextNames.flatMap(name => entries.filter(entry => entry.name === name));

/** 列表压缩展示，抽屉保留原文；时间优先用时序字段，兼容旧 createTime 数据。 */
export const getSystemLogSummary = (record: SystemLogRecord) => {
    const timestamp = isLogTimestamp(record.timestamp) ? record.timestamp : record.createTime;
    const exception = typeof record.exceptionStack === 'string' && record.exceptionStack.trim()
        ? record.exceptionStack : '';
    const context = isObjectRecord(record.context) ? record.context : {};
    return {
        level: getSystemLogLevel(record.level),
        time: formatLogTime(timestamp, 'HH:mm:ss.SSS'),
        date: formatLogTime(timestamp, 'YYYY-MM-DD'),
        fullTime: formatLogTime(timestamp, 'YYYY-MM-DD HH:mm:ss.SSS'),
        message: displayText(record.message),
        server: displayText(context.server),
        thread: displayText(record.threadName),
        logger: displayText(record.name),
        location: formatSystemLogLocation(record),
        fullLocation: formatSystemLogLocation(record, false),
        exception,
        exceptionSummary: exception.split(/\r?\n/).find(line => line.trim())?.trim() ?? '',
    };
};
