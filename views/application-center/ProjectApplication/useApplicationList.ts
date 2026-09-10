import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import type { ConditionFilterChangePayload, ConditionFilterField } from '@jetlinks-web-core/components/ConditionFilter'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { useApplicationOpenGuard } from './useApplicationOpenGuard'
import { useProjectApplication } from './useProjectApplication'
import type { ProjectApplication } from './types'

/** 编排应用列表、筛选和创建后的刷新，复用现有应用服务及访问检查。 */
export const useApplicationList = () => {
  const { t: $t } = useI18n()
  const route = useRoute()
  const router = useRouter()
  const menuStore = useMenuStore()
  const store = useProjectApplication()
  const loading = ref(false)
  const loadFailed = ref(false)
  const createOpen = ref(false)
  const filters = ref<ConditionFilterChangePayload['filter']>({ terms: [] })
  const updatingApplicationIds = ref<string[]>([])
  let refreshSequence = 0
  const {
    roleSelectOpen,
    roleSelectRoles,
    pendingApplication,
    openingApplicationIds,
    roleBinding,
    openApplication,
    confirmSelectedRole,
    resetRoleSelection,
  } = useApplicationOpenGuard()

  const statusOptions = computed(() => [
    { label: $t('ProjectApplication.common.enabled'), value: 'enabled' },
    { label: $t('ProjectApplication.common.disabled'), value: 'disabled' },
  ])
  const filterFields = computed<ConditionFilterField[]>(() => [
    {
      title: $t('ProjectApplication.create.name'),
      dataIndex: 'name',
      search: {
        type: 'string',
        defaultTermType: 'like',
        componentProps: {
          placeholder: $t('ProjectApplication.list.searchPlaceholder'),
        },
      },
    },
    {
      title: $t('ProjectApplication.detail.status'),
      dataIndex: 'state',
      search: {
        type: 'select',
        defaultTermType: 'eq',
        options: statusOptions,
        componentProps: {
          placeholder: $t('ProjectApplication.list.allStatus'),
        },
      },
    },
  ])
  const hasFilters = computed(() => filters.value.terms.length > 0)

  // 快捷入口先挂载列表，再把一次性路由动作转换为本页创建弹窗状态。
  watch(() => route.query.action, (action) => {
    if (action !== 'create') return
    createOpen.value = true
    const { action: _action, ...query } = route.query
    void router.replace({ query })
  }, { immediate: true })

  const cardItems = computed(() => store.applications.map(application => ({
    application,
    template: store.templates.find(item => item.id === application.templateId) || {
      id: application.templateId,
      name: application.templateId,
      code: application.templateId,
      description: '',
      status: 'disabled' as const,
      statusText: '',
      sortIndex: 0,
      layoutVariant: 'application' as const,
      disabled: true,
    },
  })))

  /** 筛选和刷新可以重叠，仅最新请求更新加载和错误状态。 */
  const refresh = async () => {
    const sequence = ++refreshSequence
    loading.value = true
    loadFailed.value = false
    try {
      await store.loadApplications(filters.value)
    } catch {
      if (sequence === refreshSequence) loadFailed.value = true
    } finally {
      if (sequence === refreshSequence) loading.value = false
    }
  }

  onMounted(() => { void refresh() })

  /** 应用筛选不依赖 URL 中的项目参数。 */
  const handleSearch = ({ filter }: ConditionFilterChangePayload) => {
    filters.value = filter
    void refresh()
  }

  onMounted(() => store.loadTemplates().catch(() => undefined))

  /** 按应用 ID 打开详情。 */
  const openDetail = (id: string) => menuStore.jumpPage('application-center/ProjectApplication/Detail', { params: { id } })

  /** 更新应用启停状态，防止重复提交。 */
  const toggleApplicationStatus = async (application: ProjectApplication) => {
    if (updatingApplicationIds.value.includes(application.id)) return
    const actionKey = application.status === 'enabled' ? 'disable' : 'enable'
    const nextStatus = application.status === 'enabled' ? 'disabled' : 'enabled'
    updatingApplicationIds.value = [...updatingApplicationIds.value, application.id]
    try {
      const updated = await store.updateApplication(application.id, { status: nextStatus })
      if (updated) {
        onlyMessage($t('ProjectApplication.detail.statusSuccess', {
          action: $t(`ProjectApplication.common.${actionKey}`),
          name: updated.name,
        }))
      }
    } finally {
      updatingApplicationIds.value = updatingApplicationIds.value.filter(id => id !== application.id)
    }
  }

  /** 创建完成后关闭弹窗并刷新应用列表。 */
  const handleCreated = () => {
    createOpen.value = false
    void refresh()
  }

  return {
    loading,
    loadFailed,
    createOpen,
    filterFields,
    hasFilters,
    cardItems,
    updatingApplicationIds,
    roleSelectOpen,
    roleSelectRoles,
    pendingApplication,
    openingApplicationIds,
    roleBinding,
    openApplication,
    confirmSelectedRole,
    resetRoleSelection,
    refresh,
    handleSearch,
    openDetail,
    toggleApplicationStatus,
    handleCreated,
  }
}
