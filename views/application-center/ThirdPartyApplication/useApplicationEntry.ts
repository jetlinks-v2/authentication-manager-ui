import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getRequestBaseApi } from '@jetlinks-web-core/utils/request-context'
import { getProjectCodeFromPathname } from '@jetlinks-web-core/utils/project-path'
import { getProjectStorage } from '@jetlinks-web-core/utils/project-storage'

/** 登录来源只提供请求上下文，不代表后端已装配 SaaS 授权或项目接入功能。 */
export const useApplicationEntry = () => {
  const route = useRoute()
  const revision = ref(0)
  const refresh = () => { revision.value++ }
  watch(() => route.fullPath, refresh)
  onMounted(() => window.addEventListener('storage', refresh))
  onBeforeUnmount(() => window.removeEventListener('storage', refresh))
  const entryKey = computed(() => {
    revision.value
    const projectCode = getProjectCodeFromPathname()
    const storage = getProjectStorage(projectCode)
    // 仅用于切换运行上下文时卸载旧页面、清理密钥，不判断项目是否有权接入。
    return JSON.stringify({ path: window.location.pathname, api: getRequestBaseApi(),
      runtime: storage?.runtime, domain: storage?.domain, applicationScope: storage?.scope })
  })
  return { entryKey }
}
