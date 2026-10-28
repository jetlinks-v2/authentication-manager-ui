import { computed, provide, ref, shallowRef, type InjectionKey, type Ref } from 'vue'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { useUserStore } from '@jetlinks-web-core/store/user'
import { getProjectCodeFromLocation, getApplicationRuntimeEntry } from '@jetlinks-web-core/utils/project-runtime'
import { getBaseApi } from '@jetlinks-web-core/utils/request-context'
import type { ResourceCapabilities } from '../services/capabilities'
import { useDashboardModules } from '../../useDashboardModules'

export interface ResourceCapabilitiesContext {
  capabilities: Readonly<Ref<ResourceCapabilities>>
  modules: ReturnType<typeof useDashboardModules>
  loading: Readonly<Ref<boolean>>
  errors: Ref<Error[]>
  scope: Readonly<Ref<string>>
  reload: () => Promise<void>
}

export const resourceCapabilitiesKey: InjectionKey<ResourceCapabilitiesContext> = Symbol('resource-center-capabilities')

/** 等待当前授权菜单；私有化同时核验已注册模块，不以探测接口的403/404推断模块缺失。 */
export function useResourceCapabilities(preview: Ref<boolean>): ResourceCapabilitiesContext {
  const modules = useDashboardModules(preview)
  const menu = useMenuStore()
  const user = useUserStore()
  const errors = shallowRef<Error[]>([])
  const reloading = ref(false)
  const capabilities = computed(() => ({
    collection: modules.value.collection,
    networkCards: modules.value.networkCards,
  }))
  const loading = computed(() => !preview.value && (reloading.value || (!errors.value.length && (!menu.initialized || menu.loading))))
  const scope = computed(() => JSON.stringify([
    user.userInfo.id || '', getProjectCodeFromLocation() || '', getBaseApi(),
    getApplicationRuntimeEntry().applicationId || '',
  ]))

  /** 显式重试刷新授权来源；普通模块变更由响应式状态同步，不额外发起能力探测。 */
  async function reload() {
    errors.value = []
    if (preview.value) return
    reloading.value = true
    try { await menu.queryMenus() }
    catch (error) { errors.value = [error instanceof Error ? error : new Error('Resource authorization unavailable')] }
    finally { reloading.value = false }
  }
  return { capabilities, modules, loading, errors, scope, reload }
}

/** 页面与卡片共享最终能力结果。 */
export function provideResourceCapabilities(context: ResourceCapabilitiesContext) {
  provide(resourceCapabilitiesKey, context)
}
