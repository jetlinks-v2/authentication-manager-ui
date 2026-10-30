import { computed, onActivated, onDeactivated, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'
import { getProjectCodeFromLocation, getProjectCodeFromPathname } from '@jetlinks-web-core/utils/project-runtime'
import { getProjectStorage, isProjectStorageEnabled } from '@jetlinks-web-core/utils/project-storage'
import { getRequestBaseApi } from '@jetlinks-web-core/utils/request-context'
import { useUserStore } from '@jetlinks-web-core/store/user'
import { getCurrentProjectSummary, type CurrentProjectSummary } from '../../../api/projectSummary'
import { getSaasOverviewAccess } from '../../../visDashboard/Base/Saas/services/access'
import { useHomeRuntime } from '../../../visDashboard/Base/shared/useHomeRuntime'
import type { SaasProjectSummary } from '../../../visDashboard/Base/Saas/components/presentation'

/** 当前项目资料独立加载，缓存仅用于首屏；切换账号/项目及离页后丢弃旧请求。 */
export function useSaasSummary() {
  const route = useRoute()
  const user = useUserStore()
  const contextRevision = ref(0)
  const active = ref(true)
  const projectInfo = ref<CurrentProjectSummary>()
  const loading = ref(false)
  const error = ref(false)
  const projectCode = computed(() => {
    contextRevision.value
    route.fullPath
    return getProjectCodeFromLocation() || (isProjectStorageEnabled() ? getProjectCodeFromPathname() : '')
  })
  const cachedProject = computed(() => {
    contextRevision.value
    return getProjectStorage(projectCode.value)
  })
  const scope = computed(() => JSON.stringify([user.userInfo.id, projectCode.value, cachedProject.value?.id, getRequestBaseApi()]))
  let sequence = 0
  let controller: AbortController | undefined
  const enabled = computed(() => getSaasOverviewAccess().showResources)
  const runtime = useHomeRuntime('SaasResources', ref(false), ref(60), undefined, undefined, enabled)
  const summary = computed<SaasProjectSummary>(() => {
    const project = cachedProject.value
    const expires = projectInfo.value?.expireTime
    return {
      id: projectCode.value || projectInfo.value?.code,
      name: projectInfo.value?.name || project?.projectName || project?.name,
      expiresAt: typeof expires === 'number' && Number.isFinite(expires) && expires > 0 && dayjs(expires).isValid()
        ? dayjs(expires).format('YYYY-MM-DD') : undefined,
      updatedAt: runtime.updatedAt.value ? dayjs(runtime.updatedAt.value).format('YYYY-MM-DD HH:mm') : undefined,
    }
  })
  /** 无到期值时留空；请求失败不把服务订阅期限或示例日期当作项目期限。 */
  async function reload() {
    controller?.abort()
    const current = ++sequence
    const currentScope = scope.value
    if (!active.value || !isProjectStorageEnabled() || (!projectCode.value && !cachedProject.value?.id)) return
    controller = new AbortController()
    loading.value = true
    error.value = false
    try {
      const info = await getCurrentProjectSummary(cachedProject.value?.id, controller.signal)
      if (current !== sequence || currentScope !== scope.value) return
      if (projectCode.value && info.code && info.code !== projectCode.value) throw new Error('Project context mismatch')
      projectInfo.value = info
    } catch {
      if (current === sequence && currentScope === scope.value) error.value = true
    } finally {
      if (current === sequence) loading.value = false
    }
  }
  const invalidate = () => {
    sequence++
    controller?.abort()
    loading.value = false
  }
  const refreshContext = () => { contextRevision.value++ }
  watch([scope, active], () => {
    invalidate()
    projectInfo.value = undefined
    error.value = false
    if (active.value) void reload()
  }, { immediate: true, flush: 'sync' })
  onMounted(() => window.addEventListener('storage', refreshContext))
  onActivated(() => {
    refreshContext()
    active.value = true
  })
  onDeactivated(() => { active.value = false })
  onUnmounted(() => {
    invalidate()
    window.removeEventListener('storage', refreshContext)
  })
  return { summary, loading, error, reload }
}
