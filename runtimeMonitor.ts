/** 资源看板公开的实时监控能力；业务模块复用同一采集、窗口及错误规则。 */
export { observeMBeans, currentMBeanValues, mbeanRecord } from './visDashboard/ResourceCenter/monitoring/stream'
export type { CurrentMBeanQuery, CurrentMBeanSample } from './visDashboard/ResourceCenter/monitoring/stream'
export { appendRealtimeWindow, realtimeWindowBounds, REALTIME_WINDOW_MS, REALTIME_WINDOW_POINTS } from './visDashboard/ResourceCenter/monitoring/window'
export type { RealtimeWindowAdapter } from './visDashboard/ResourceCenter/monitoring/window'
export { createDiagnosticsStream, unwrapDiagnosticRecord } from './visDashboard/ResourceCenter/monitoring/transport'
export { runtimeQueryError, rejectRuntimeState, realtimeRetryAt } from './visDashboard/ResourceCenter/monitoring/state'
