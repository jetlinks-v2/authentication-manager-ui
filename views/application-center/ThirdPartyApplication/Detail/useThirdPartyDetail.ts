import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { getApiApplication } from '@authentication-manager-ui/api/application-center/apiApplication'
import type { ApiApplication } from '@authentication-manager-ui/api/application-center/apiApplication'
import { queryAvailableApplications, queryProjectIntegrations, responseBody } from '@authentication-manager-ui/api/application-center/thirdPartyIntegration'
import type { AvailableApplication, IntegrationAction, ProjectIntegration } from '@authentication-manager-ui/api/application-center/thirdPartyIntegration'
import { useProjectContext } from '../useProjectContext'
import { integrationError, integrationState } from '../integrationUtils'

export const useThirdPartyDetail = () => {
  const route = useRoute()
  const { t } = useI18n()
  const menu = useMenuStore()
  const project = useProjectContext()
  const integrationId = computed(() => String(route.params.id || ''))
  const relation = ref<ProjectIntegration>()
  const profile = ref<AvailableApplication>()
  const application = ref<ApiApplication>()
  const loading = ref(false)
  const runtimeLoading = ref(false)
  const error = ref('')
  const catalogError = ref('')
  const runtimeError = ref('')
  const action = ref<IntegrationAction>()
  const activeTab = ref('basic')
  const contextError = computed(() => project.contextError.value ||
    (route.query.projectId && route.query.projectId !== project.projectId.value ? 'ThirdPartyApplication.project.projectMismatch' : ''))
  const runtimeApplicationId = computed(() => relation.value?.runtimeApplicationId || '')
  const runtimeReady = computed(() => !!relation.value && relation.value.projectId === project.projectId.value &&
    project.hasRuntimeContext.value && relation.value.runtimeId === project.context.value.runtimeId && !!runtimeApplicationId.value)
  const title = computed(() => profile.value?.name || relation.value?.appId || t('ThirdPartyApplication.detail'))
  const canEnable = computed(() => !!profile.value && runtimeReady.value && !!application.value && !loading.value && !runtimeLoading.value)
  let generation = 0
  const refreshRuntime = async () => {
    const id = generation
    application.value = undefined; runtimeError.value = ''
    if (!runtimeReady.value) return
    const appId = runtimeApplicationId.value
    runtimeLoading.value = true
    try {
      const result = responseBody(await getApiApplication(appId))
      if (id !== generation) return
      if (!result || result.id !== appId || result.provider !== 'api-application') throw new Error('ThirdPartyApplication.project.runtimeApplicationMismatch')
      application.value = result
    } catch (cause) { if (id === generation) runtimeError.value = integrationError(cause, t) }
    finally { if (id === generation) runtimeLoading.value = false }
  }
  const load = async () => {
    const id = ++generation
    relation.value = undefined; profile.value = undefined; application.value = undefined
    error.value = ''; catalogError.value = ''; runtimeError.value = ''; action.value = undefined
    runtimeLoading.value = false
    if (contextError.value || !integrationId.value) { loading.value = false; return }
    loading.value = true
    const projectId = project.projectId.value
    const selectedId = integrationId.value
    const [relations, catalog] = await Promise.allSettled([queryProjectIntegrations(projectId), queryAvailableApplications(projectId)])
    if (id !== generation) return
    if (relations.status === 'fulfilled') {
      relation.value = relations.value.find(item => item.id === selectedId && item.projectId === projectId)
      if (!relation.value) error.value = t('ThirdPartyApplication.project.notFound')
    } else error.value = integrationError(relations.reason, t)
    if (catalog.status === 'fulfilled') profile.value = catalog.value.find(item => item.appId === relation.value?.appId && item.environment === relation.value?.environment)
    else catalogError.value = integrationError(catalog.reason, t)
    loading.value = false
    await refreshRuntime()
  }
  const back = () => menu.jumpPage('application-center/ThirdPartyApplication', {})
  const openAction = (state: IntegrationAction['state']) => {
    if (!relation.value || (state === 'enabled' && !canEnable.value)) return
    action.value = { projectId: project.projectId.value, integration: relation.value, state,
      activateApi: state === 'enabled' && integrationState(relation.value.state) === 'enabled' }
  }
  const acceptRelation = (value: ProjectIntegration) => {
    if (value.projectId !== project.projectId.value || value.id !== integrationId.value) return
    relation.value = value
  }
  const stateSaved = async (value: ProjectIntegration) => {
    acceptRelation(value)
    if (integrationState(value.state) === 'removed') { back(); return }
    await refreshRuntime()
  }
  watch([project.contextKey, integrationId, () => route.query.projectId], () => {
    activeTab.value = ['basic', 'oauth', 'grants', 'subscriptions'].includes(String(route.query.tab)) ? String(route.query.tab) : 'basic'
    void load()
  }, { immediate: true })
  onBeforeUnmount(() => { generation++ })
  return { ...project, contextError, integrationId, relation, profile, application, runtimeApplicationId, title,
    loading, runtimeLoading, error, catalogError, runtimeError, runtimeReady, canEnable, activeTab,
    action, load, refreshRuntime, back, openAction, acceptRelation, stateSaved }
}
