import { computed, onActivated, onDeactivated, ref, type Component, type Ref } from 'vue'
import { useDocumentVisibility } from '@vueuse/core'
import { useResourceCapabilities } from '../hooks/useResourceCapabilities'
import { usePrivateQuery } from '../../Base/Private/usePrivateQuery'
import { moduleRegistry } from '@jetlinks-web-core/utils/module-registry'
import { loadGatewayDirectory } from '../services/gatewayStatus'
import { settingsOf, type ResourceInfo } from '../shared'

/** 资源层只负责授权节点目录；采样由边缘模块公开组件承担，编辑态不发起真实请求。 */
export function useVisionTaskTrend(info: Ref<ResourceInfo | undefined>, isEdit: Ref<boolean>) {
  const preview = computed(() => isEdit.value || Boolean(info.value?.componentProps?.preview))
  const capabilities = useResourceCapabilities(preview)
  const visibility = useDocumentVisibility(), activated = ref(true)
  const available = computed(() => capabilities.modules.value.edge && capabilities.modules.value.vision)
  const component = computed(() => available.value ? moduleRegistry.getResourceItem<Component>('edge-master-ui', 'components', 'GatewayVisionTrend') : undefined)
  const enabled = computed(() => available.value && !!component.value && !preview.value && activated.value && visibility.value === 'visible')
  const directory = usePrivateQuery(() => {
    const identity = capabilities.scope.value
    return loadGatewayDirectory(() => enabled.value && identity === capabilities.scope.value)
  }, capabilities.scope, enabled, { retainOnError: true, retryIntervalMs: 2000 })
  onActivated(() => { activated.value = true })
  onDeactivated(() => { activated.value = false })
  return { available, component, directory, enabled, config: computed(() => settingsOf('VisionTaskRanking', info.value)) }
}
