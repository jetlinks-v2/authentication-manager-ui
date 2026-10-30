import { computed, ref, watch, type Ref } from 'vue'
import { LocalStore } from '@jetlinks-web/utils'
import { moduleRegistry } from '@jetlinks-web-core/utils/module-registry'

interface MonitorNode {
  nodeId: string
  cpuSystem?: number
  memorySystem?: number
  memorySystemUsed?: number
  memorySystemTotal?: number
  memoryJvm?: number
  memoryJvmUsed?: number
  memoryJvmTotal?: number
  disk?: number
  diskUsed?: number
  diskTotal?: number
}
interface MonitorRuntime {
  nodes: Ref<MonitorNode[]>
  loading: Ref<boolean>
  error: Ref<boolean>
  refresh: () => void
}
export interface MonitorCell { id: string; value?: number; used?: number; total?: number }
export interface MonitorOverviewRow { id: string; cells: MonitorCell[] }

/** 从设备模块公开 hook 取得同一份归一化监控数据，概览不复制 WebSocket 或阈值算法。 */
export function usePrivateMonitor(enabled: Ref<boolean>, scope: Ref<string>) {
  const hooks = moduleRegistry.getResource('device-manager-ui', 'hooks') as {
    useSystemMonitorOverview?: (enabled: Ref<boolean>) => MonitorRuntime
  } | undefined
  const runtime = hooks?.useSystemMonitorOverview?.(enabled) ?? {
    nodes: ref<MonitorNode[]>([]), loading: ref(false), error: ref(true), refresh: () => {},
  }
  watch(enabled, value => { if (!value) runtime.nodes.value = [] })
  watch(scope, () => {
    runtime.nodes.value = []
    if (enabled.value) runtime.refresh()
  })
  const rows = computed<MonitorOverviewRow[]>(() => !enabled.value || runtime.error.value ? [] : runtime.nodes.value.map(node => ({
    id: node.nodeId,
    cells: [
      { id: 'cpu', value: node.cpuSystem },
      { id: 'memory', value: node.memorySystem, used: node.memorySystemUsed, total: node.memorySystemTotal },
      { id: 'heap', value: node.memoryJvm, used: node.memoryJvmUsed, total: node.memoryJvmTotal },
      { id: 'disk', value: node.disk, used: node.diskUsed, total: node.diskTotal },
    ],
  })))
  const version = String(LocalStore.get('system_version') || '')
  return { rows, loading: runtime.loading, error: runtime.error, refresh: runtime.refresh, version }
}
