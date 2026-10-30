import { computed } from 'vue'
import { useAuthStore } from '@jetlinks-web-core/store/auth'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { getHomeConfig } from '../shared/config'
import { HOME_TARGETS } from '../shared/navigation'
import type { HomeInfo, HomeRow } from '../shared/types'
import { useApplicationOpenGuard } from '../../../views/application-center/ProjectApplication/useApplicationOpenGuard'
import type { ProjectApplication } from '../../../views/application-center/ProjectApplication/types'

interface HomeApplicationOptions {
  isEdit: () => boolean
  info: () => HomeInfo | undefined
}

/** 首页应用沿用正式访问检查；创建入口同时验证菜单和菜单定义的 add 操作权限。 */
export function useHomeApplications(options: HomeApplicationOptions) {
  const menuStore = useMenuStore()
  const auth = useAuthStore()
  const { openingApplicationIds, openApplication } = useApplicationOpenGuard()
  const navigationEnabled = computed(() => !options.isEdit() && getHomeConfig('Applications', options.info()).chart.navigation)
  const createTarget = HOME_TARGETS.createApplication
  const createMenu = computed(() => createTarget.menus.find(code => menuStore.getMenu(code)))
  const canCreateApp = computed(() => navigationEnabled.value && !!createMenu.value
    && auth.hasPermission(`${createMenu.value}:add`))

  /** 预览、禁用及正在打开的应用不再次触发准入请求。 */
  function canOpenApp(row: HomeRow) {
    return navigationEnabled.value && !openingApplicationIds.value.includes(row.id)
      && row.application?.status !== 'disabled'
  }

  /** 继续使用应用模块的成员准入与专属菜单检查，不在概览拼装访问地址。 */
  async function handleOpenApp(row: HomeRow) {
    if (!canOpenApp(row)) return
    const application: ProjectApplication = row.application || {
      id: row.id,
      name: row.label || row.id,
      templateId: '',
      status: 'enabled',
      statusText: '',
      description: row.description || '',
      createdAt: '',
      defaultLanguage: 'zh-CN',
      timezone: 'Asia/Shanghai',
      domain: '',
    }
    await openApplication(application)
  }

  /** 一次性 action=create 由应用列表消费；点击时再次校验，防止权限变化后仍执行旧入口。 */
  function handleCreateApp() {
    if (!canCreateApp.value || !createMenu.value) return
    menuStore.jumpPage(createMenu.value, { params: createTarget.params, query: createTarget.query })
  }

  return { openingApplicationIds, canOpenApp, canCreateApp, handleOpenApp, handleCreateApp }
}
