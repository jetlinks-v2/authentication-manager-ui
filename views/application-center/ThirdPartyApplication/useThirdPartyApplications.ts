import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { queryAvailableApplications, queryProjectIntegrations } from '@authentication-manager-ui/api/application-center/thirdPartyIntegration'
import type { AvailableApplication, IntegrationAction, ProjectIntegration } from '@authentication-manager-ui/api/application-center/thirdPartyIntegration'
import { useProjectContext } from './useProjectContext'
import { integrationError } from './integrationUtils'

export const useThirdPartyApplications = () => {
  const { t } = useI18n()
  const menuStore = useMenuStore()
  const project = useProjectContext()
  const integrations = ref<ProjectIntegration[]>([])
  const applications = ref<AvailableApplication[]>([])
  const loading = ref(false)
  const error = ref('')
  const catalogError = ref('')
  const search = ref('')
  const connectOpen = ref(false)
  const action = ref<IntegrationAction>()
  let requestId = 0
  const load = async () => {
    const id = ++requestId
    error.value = ''; catalogError.value = ''
    integrations.value = []; applications.value = []
    if (project.contextError.value) { loading.value = false; return }
    loading.value = true
    const projectId = project.projectId.value
    const [relations, catalog] = await Promise.allSettled([
      queryProjectIntegrations(projectId), queryAvailableApplications(projectId),
    ])
    if (id !== requestId) return
    if (relations.status === 'fulfilled') integrations.value = relations.value.filter(item => item.projectId === projectId)
    else error.value = integrationError(relations.reason, t)
    if (catalog.status === 'fulfilled') applications.value = catalog.value
    else catalogError.value = integrationError(catalog.reason, t)
    loading.value = false
  }
  const nameOf = (item: ProjectIntegration) => applications.value.find(app => app.appId === item.appId)?.name || item.appId
  const rows = computed(() => integrations.value.filter(item =>
    (nameOf(item) + ' ' + item.id + ' ' + item.appId).toLowerCase().includes(search.value.trim().toLowerCase())))
  const connectOptions = computed(() => applications.value.filter(app => !integrations.value.some(item => item.appId === app.appId)))
  const openDetail = (item: ProjectIntegration) => menuStore.jumpPage('application-center/ThirdPartyApplication/Detail', {
    params: { id: item.id }, query: { entry: 'project', projectId: item.projectId, tab: 'basic' },
  })
  const openAction = (item: ProjectIntegration, state: 'disabled' | 'removed') => {
    action.value = { projectId: project.projectId.value, integration: item, state }
  }
  watch(project.contextKey, () => { connectOpen.value = false; action.value = undefined; search.value = ''; void load() }, { immediate: true })
  onBeforeUnmount(() => { requestId++ })
  return { ...project, integrations, applications, loading, error, catalogError, search, connectOpen,
    action, rows, connectOptions, nameOf, load, openDetail, openAction }
}
