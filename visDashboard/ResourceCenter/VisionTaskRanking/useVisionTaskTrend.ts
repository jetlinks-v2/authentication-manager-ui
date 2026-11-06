import { computed, onActivated, onDeactivated, ref, type Ref } from 'vue'
import { useDocumentVisibility } from '@vueuse/core'
import { useResourceCapabilities } from '../hooks/useResourceCapabilities'
import { usePrivateQuery } from '../../Base/Private/usePrivateQuery'
import { moduleRegistry } from '@jetlinks-web-core/utils/module-registry'
import { loadGatewayDirectory } from '../services/gatewayStatus'
import { settingsOf, type ResourceInfo } from '../shared'
import { createMonitorQueryClient } from '../monitoring/client'
import { mbeanRecord } from '../monitoring/stream'
import type { VisionTrendGateway } from './trend/types'

/** 资源层只负责授权节点目录；采样由同模块的视觉趋势组件承担，编辑态不发起真实请求。 */
export function useVisionTaskTrend(info: Ref<ResourceInfo | undefined>, isEdit: Ref<boolean>) {
  const preview = computed(() => isEdit.value || Boolean(info.value?.componentProps?.preview))
  const capabilities = useResourceCapabilities(preview)
  const visibility = useDocumentVisibility(), activated = ref(true)
  const local = computed(() => { void capabilities.modules.value; return moduleRegistry.hasModule('edge-basic-ui') })
  const available = computed(() => capabilities.modules.value.vision && (local.value || capabilities.modules.value.edge))
  const enabled = computed(() => available.value && !preview.value && activated.value && visibility.value === 'visible')
  const directory = usePrivateQuery<VisionTrendGateway[]>(() => {
    const identity = capabilities.scope.value
    const current = () => enabled.value && identity === capabilities.scope.value
    return local.value ? loadLocalMonitor(current) : loadGatewayDirectory(current)
  }, capabilities.scope, enabled, { retainOnError: true, retryIntervalMs: 2000 })
  onActivated(() => { activated.value = true })
  onDeactivated(() => { activated.value = false })
  return { available, directory, enabled, scope: capabilities.scope, config: computed(() => settingsOf('VisionTaskRanking', info.value)) }
}

/** 本机目标由当前监控节点发现，边端不查询云端网关目录，也不显示节点选择框。 */
async function loadLocalMonitor(current: () => boolean): Promise<VisionTrendGateway[]> {
  const value = await createMonitorQueryClient(current).get('/system/monitor/members')
  if (!Array.isArray(value)) throw new Error('Invalid local monitor nodes')
  const nodes = value.map(mbeanRecord), own = nodes.filter(node => node.current === true)
  const node = own.length === 1 ? own[0] : nodes.length === 1 ? nodes[0] : undefined
  if (typeof node?.id !== 'string' || !node.id) throw new Error('Current monitor node unavailable')
  return [{ id: node.id, name: typeof node.name === 'string' ? node.name : node.id, online: true, local: true }]
}
