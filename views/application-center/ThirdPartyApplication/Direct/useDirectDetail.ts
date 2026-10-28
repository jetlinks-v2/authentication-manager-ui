import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { deleteApiApplication, getApiApplication, updateApiApplication } from '@authentication-manager-ui/api/application-center/apiApplication'
import type { ApiApplication } from '@authentication-manager-ui/api/application-center/apiApplication'
import { apiState, applicationError, responseBody } from '../applicationUtils'
import type { AccessDebugMode, ApplicationLogFilter } from './accessDebugUtils'

export type ApplicationTextField = 'name' | 'description'

export const useDirectDetail = () => {
  const route = useRoute()
  const menu = useMenuStore()
  const { t } = useI18n()
  const application = ref<ApiApplication>()
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const activeTab = ref('basic')
  const debugMode = ref<AccessDebugMode>('token')
  const logFilter = ref<ApplicationLogFilter>()
  const openLogs = (filter: ApplicationLogFilter) => { logFilter.value = filter; activeTab.value = 'logs' }
  const openDebug = (mode: AccessDebugMode) => { debugMode.value = mode; activeTab.value = 'debug' }
  const tabOptions = computed(() => [
    { key: 'basic', label: t('ThirdPartyApplication.direct.credentialsTab') },
    { key: 'grants', label: t('ThirdPartyApplication.direct.grants') },
    { key: 'subscriptions', label: t('ApiApplication.subscription.title') },
    { key: 'guide', label: t('ThirdPartyApplication.direct.guideTab') },
    { key: 'debug', label: t('ThirdPartyApplication.direct.debugTab') },
    { key: 'logs', label: t('ThirdPartyApplication.logs.title') },
  ])
  const form = reactive({ name: '', description: '' })
  const textState = reactive<Record<ApplicationTextField, { saving: boolean; error: string }>>({
    name: { saving: false, error: '' },
    description: { saving: false, error: '' },
  })
  const textSaving = computed(() => textState.name.saving || textState.description.saving)
  let generation = 0
  onBeforeUnmount(() => { generation++ })
  const load = async () => {
    const current = ++generation
    application.value = undefined; error.value = ''; loading.value = true; saving.value = false
    for (const field of ['name', 'description'] as const) {
      form[field] = ''
      Object.assign(textState[field], { saving: false, error: '' })
    }
    try {
      const id = String(route.params.id || '')
      if (!id) throw new Error('ThirdPartyApplication.direct.notFound')
      const value = responseBody(await getApiApplication(id))
      if (current !== generation) return
      if (!value || value.id !== id || value.provider !== 'api-application') {
        throw new Error('ThirdPartyApplication.direct.notFound')
      }
      application.value = value
      form.name = value.name; form.description = value.description || ''
    } catch (cause) { if (current === generation) error.value = applicationError(cause, t) }
    finally { if (current === generation) loading.value = false }
  }
  const back = () => menu.jumpPage('application-center/ThirdPartyApplication', {})
  const saveText = async (field: ApplicationTextField, value: string) => {
    if (!application.value || saving.value || textState[field].saving) return
    const state = textState[field]
    const nextValue = value.trim()
    form[field] = nextValue
    state.error = ''
    if (field === 'name' && !nextValue) {
      state.error = t('ThirdPartyApplication.direct.autosave.nameRequired')
      return
    }
    if (nextValue === (application.value[field] || '')) return
    const current = generation
    const id = application.value.id
    state.saving = true
    try {
      // 每次只更新当前字段，避免两个行内编辑请求互相覆盖。
      await updateApiApplication(id, { [field]: nextValue })
      if (current !== generation || !application.value) return
      application.value[field] = nextValue
    } catch (cause) { if (current === generation) state.error = applicationError(cause, t) }
    finally { if (current === generation) state.saving = false }
  }
  const mutate = async (operation: (id: string) => Promise<unknown>, onSuccess: () => void) => {
    if (!application.value || saving.value || textSaving.value) return
    const current = generation
    const id = application.value.id
    saving.value = true; error.value = ''
    try {
      await operation(id)
      if (current !== generation) return
      onlyMessage(t('ThirdPartyApplication.direct.saved'))
      onSuccess()
    } catch (cause) { if (current === generation) error.value = applicationError(cause, t) }
    finally { if (current === generation) saving.value = false }
  }
  const toggle = () => {
    const state = apiState(application.value) === 'enabled' ? 'disabled' : 'enabled'
    return mutate(id => updateApiApplication(id, { state }), () => {
      if (application.value) application.value.state = state
    })
  }
  const remove = () => mutate(deleteApiApplication, back)
  watch(() => route.params.id, () => {
    activeTab.value = ['basic', 'grants', 'subscriptions', 'guide', 'debug', 'logs'].includes(String(route.query.tab)) ? String(route.query.tab) : 'basic'
    debugMode.value = 'token'
    logFilter.value = undefined
    void load()
  }, { immediate: true })
  return { application, loading, saving, textSaving, textState, error, form, activeTab, tabOptions, debugMode, logFilter, openDebug, openLogs, load, back, saveText, toggle, remove }
}
