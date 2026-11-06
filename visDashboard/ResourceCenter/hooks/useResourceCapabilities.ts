import { computed, onScopeDispose, provide, ref, shallowRef, watch, type InjectionKey, type Ref } from 'vue'
import { isSaaS } from '@jetlinks-web-core/utils/consts'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { useUserStore } from '@jetlinks-web-core/store/user'
import { getProjectCodeFromLocation, getApplicationRuntimeEntry } from '@jetlinks-web-core/utils/project-runtime'
import { getBaseApi } from '@jetlinks-web-core/utils/request-context'
import { hasResourceEdgeService, type ResourceCapabilities } from '../services/capabilities'
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

/** 等待当前授权菜单；资源页可额外核验后端边缘服务声明。 */
export function useResourceCapabilities(preview: Ref<boolean>, checkEdgeService = false): ResourceCapabilitiesContext {
  const registeredModules = useDashboardModules(preview)
  const menu = useMenuStore()
  const user = useUserStore()
  const errors = shallowRef<Error[]>([])
  const reloading = ref(false)
  const edgeSupported = ref(false)
  const edgeLoading = ref(false)
  const edgeError = shallowRef<Error>()
  const revision = ref(0)
  const modules = computed(() => ({ ...registeredModules.value,
    edge: registeredModules.value.edge && (!checkEdgeService || isSaaS || preview.value || edgeSupported.value),
  }))
  const capabilities = computed(() => ({
    collection: modules.value.collection,
    networkCards: modules.value.networkCards,
  }))
  // 授权菜单可能早于账号信息就绪，个人画布须等待用户 ID，避免读写多个账号共用的空身份缓存。
  const loading = computed(() => !preview.value && (reloading.value || edgeLoading.value
    || (!errors.value.length && (!user.userInfo.id || !menu.initialized || menu.loading))))
  // 保持已保存 key 的格式；项目 code 隔离不同项目，空项目字段专属于无项目后台，账号/API/应用仍各自隔离。
  const scope = computed(() => JSON.stringify([
    user.userInfo.id || '', getProjectCodeFromLocation() || '', getBaseApi(),
    getApplicationRuntimeEntry().applicationId || '',
  ]))
  let reloadGeneration = 0
  watch([scope, preview], () => {
    reloadGeneration += 1
    reloading.value = false
    errors.value = []
  }, { flush: 'sync' })
  onScopeDispose(() => { reloadGeneration += 1 })

  watch([scope, () => registeredModules.value.edge && !!user.userInfo.id, preview, revision], async ([, edge, isPreview], _, onCleanup) => {
    let current = true
    onCleanup(() => { current = false })
    edgeSupported.value = false
    edgeLoading.value = false
    edgeError.value = undefined
    if (!checkEdgeService || isSaaS || isPreview || !edge) return
    edgeLoading.value = true
    try {
      const supported = await hasResourceEdgeService()
      if (current) edgeSupported.value = supported
    } catch (error) {
      if (current) edgeError.value = error instanceof Error ? error : new Error('Edge capability unavailable')
    } finally {
      if (current) edgeLoading.value = false
    }
  }, { immediate: true, flush: 'sync' })

  /** 显式重试刷新授权来源及资源页所需的边缘服务能力。 */
  async function reload() {
    const current = ++reloadGeneration
    errors.value = []
    edgeError.value = undefined
    if (preview.value) return
    reloading.value = true
    try {
      const result = await menu.queryMenus()
      if (current === reloadGeneration && result?.applied !== false) revision.value += 1
    } catch (error) {
      if (current === reloadGeneration) errors.value = [error instanceof Error ? error : new Error('Resource authorization unavailable')]
    } finally {
      if (current === reloadGeneration) reloading.value = false
    }
  }
  const allErrors = computed({ get: () => edgeError.value ? [...errors.value, edgeError.value] : errors.value,
    set: value => { errors.value = value } })
  return { capabilities, modules, loading, errors: allErrors, scope, reload }
}

/** 页面与卡片共享最终能力结果。 */
export function provideResourceCapabilities(context: ResourceCapabilitiesContext) {
  provide(resourceCapabilitiesKey, context)
}
