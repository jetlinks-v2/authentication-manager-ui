import { computed, onScopeDispose, ref, type Ref } from 'vue'
import { moduleRegistry } from '@jetlinks-web-core/utils/module-registry'
import { isSaaS } from '@jetlinks-web-core/utils/consts'

/** 注册发生在业务模块加载之后，按使用时机读取，不能在文件顶层缓存模块状态。 */
export function getDashboardModules() {
  return {
    model: isSaaS || moduleRegistry.hasModule('visualization-model-ui'),
    edge: isSaaS || moduleRegistry.hasModule('edge-master-ui'),
  }
}

/** 页面与独立卡片共用模块规则；卸载时清理注册监听，预览不依赖实际安装模块。 */
export function useDashboardModules(preview: Ref<boolean> = ref(false)) {
  const revision = ref(0)
  onScopeDispose(moduleRegistry.onChange(() => { revision.value += 1 }))
  return computed(() => {
    void revision.value
    return preview.value ? { model: true, edge: true } : getDashboardModules()
  })
}
