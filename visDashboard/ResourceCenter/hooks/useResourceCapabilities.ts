import { computed, onScopeDispose, provide, ref, shallowRef, watch, type InjectionKey, type Ref } from 'vue'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { useUserStore } from '@jetlinks-web-core/store/user'
import { getGlobModules } from '@jetlinks-web-core/router/globModules'
import { isSaaS } from '@jetlinks-web-core/utils/consts'
import { getProjectCodeFromLocation } from '@jetlinks-web-core/utils/project-runtime'
import { getBaseApi } from '@jetlinks-web-core/utils/request-context'
import { loadResourceCapabilities, type ResourceCapabilities } from '../services/capabilities'
import { useDashboardModules } from '../../useDashboardModules'

export interface ResourceCapabilitiesContext {
  capabilities: Ref<ResourceCapabilities>
  modules: ReturnType<typeof useDashboardModules>
  loading: Ref<boolean>
  errors: Ref<Error[]>
  scope: Readonly<Ref<string>>
  reload: () => Promise<void>
}

export const resourceCapabilitiesKey: InjectionKey<ResourceCapabilitiesContext> = Symbol('resource-center-capabilities')
const noOptionalResources = (): ResourceCapabilities => ({ collection: false, networkCards: false })

/** 正式页面集中检查可选模块；账号、菜单或运行范围变化后立即撤销旧结果并丢弃迟到响应。 */
export function useResourceCapabilities(preview: Ref<boolean>): ResourceCapabilitiesContext {
  const modules = useDashboardModules(preview)
  const menu = useMenuStore()
  const user = useUserStore()
  const capabilities = shallowRef<ResourceCapabilities>(noOptionalResources())
  const loading = ref(true)
  const errors = shallowRef<Error[]>([])
  const scope = computed(() => JSON.stringify([
    user.userInfo.id || '', getProjectCodeFromLocation() || '', getBaseApi(),
  ]))
  let epoch = 0

  async function reload() {
    const current = ++epoch
    errors.value = []
    capabilities.value = noOptionalResources()
    if (preview.value) {
      capabilities.value = { collection: true, networkCards: true }
      loading.value = false
      return
    }
    if (!menu.initialized || !user.userInfo.id) {
      loading.value = true
      return
    }
    if (isSaaS) {
      loading.value = false
      return
    }
    loading.value = true
    try {
      // 与菜单装配复用同一份真实前端路由来源，不能用空 register 资源判断模块是否已打包。
      const routes = await getGlobModules()
      if (current !== epoch) return
      const result = await loadResourceCapabilities({
        collection: !!routes['data-collect'] && !!menu.getMenu('data-collect'),
        networkCards: !!routes['iot-card/CardManagement'] && !!menu.getMenu('iot-card/CardManagement'),
      })
      if (current === epoch) capabilities.value = result
    } catch (error) {
      if (current === epoch) errors.value = [error instanceof Error ? error : new Error('Resource capability check failed')]
    } finally {
      if (current === epoch) loading.value = false
    }
  }

  watch([scope, () => menu.initialized, () => menu.menusMap, preview], () => { void reload() }, { immediate: true })
  onScopeDispose(() => { ++epoch })
  return { capabilities, modules, loading, errors, scope, reload }
}

/** 卡片内快捷操作复用页面能力结果，不再各自发起重复能力查询。 */
export function provideResourceCapabilities(context: ResourceCapabilitiesContext) {
  provide(resourceCapabilitiesKey, context)
}
