import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { TOKEN_KEY } from '@jetlinks-web/constants'
import { getProjectCodeFromLocation } from '@jetlinks-web-core/utils/project-runtime'
import { getProjectStorage } from '@jetlinks-web-core/utils/project-storage'

/** 路径是项目 code；控制面 ID 只取既有项目入口写入的 id，不跨对象猜测 ID。 */
export const useProjectContext = () => {
  const route = useRoute()
  const revision = ref(0)
  const refreshContext = () => { revision.value++ }
  watch(() => route.fullPath, refreshContext)
  onMounted(() => window.addEventListener('storage', refreshContext))
  onBeforeUnmount(() => window.removeEventListener('storage', refreshContext))
  const context = computed(() => {
    revision.value
    const projectCode = getProjectCodeFromLocation()
    const storage = getProjectStorage(projectCode)
    return {
      projectCode,
      projectId: storage?.id || '',
      runtimeId: storage?.runtime || '',
      name: storage?.projectName || storage?.name || '',
      hasRuntimeToken: !!storage?.token,
      hasControlToken: !!localStorage.getItem(TOKEN_KEY),
      isApplication: !!storage?.scope,
    }
  })
  const contextError = computed(() => {
    if (context.value.isApplication) return 'ThirdPartyApplication.project.projectOnly'
    if (!context.value.projectId) return 'ThirdPartyApplication.project.contextMissing'
    if (!context.value.hasControlToken) return 'ThirdPartyApplication.project.controlSessionMissing'
    return ''
  })
  const projectId = computed(() => context.value.projectId)
  const contextKey = computed(() => JSON.stringify(context.value))
  const hasRuntimeContext = computed(() => !!context.value.runtimeId && context.value.hasRuntimeToken && !context.value.isApplication)
  return { context, contextKey, contextError, projectId, hasRuntimeContext, refreshContext }
}
