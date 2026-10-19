import { onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { deleteApiApplication, getApiApplication, updateApiApplication } from '@authentication-manager-ui/api/application-center/apiApplication'
import type { ApiApplication } from '@authentication-manager-ui/api/application-center/apiApplication'
import { apiState, applicationError, responseBody } from '../applicationUtils'

export const useDirectDetail = () => {
  const route = useRoute()
  const menu = useMenuStore()
  const { t } = useI18n()
  const application = ref<ApiApplication>()
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const activeTab = ref('basic')
  const form = reactive({ name: '', description: '' })
  let generation = 0
  onBeforeUnmount(() => { generation++ })
  const load = async () => {
    const current = ++generation
    application.value = undefined; error.value = ''; loading.value = true; saving.value = false
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
  const mutate = async (operation: (id: string) => Promise<unknown>, remove = false) => {
    if (!application.value || saving.value) return
    const current = generation
    const id = application.value.id
    saving.value = true; error.value = ''
    try {
      await operation(id)
      if (current !== generation) return
      onlyMessage(t('ThirdPartyApplication.direct.saved'))
      if (remove) back()
      else await load()
    } catch (cause) { if (current === generation) error.value = applicationError(cause, t) }
    finally { if (current === generation) saving.value = false }
  }
  const save = () => { if (form.name.trim()) return mutate(id => updateApiApplication(id, { name: form.name.trim(), description: form.description.trim() })) }
  const toggle = () => {
    const state = apiState(application.value) === 'enabled' ? 'disabled' : 'enabled'
    return mutate(id => updateApiApplication(id, { state }))
  }
  const remove = () => mutate(deleteApiApplication, true)
  watch(() => route.params.id, () => {
    activeTab.value = ['basic', 'grants', 'oauth', 'subscriptions'].includes(String(route.query.tab)) ? String(route.query.tab) : 'basic'
    void load()
  }, { immediate: true })
  return { application, loading, saving, error, form, activeTab, load, back, save, toggle, remove }
}
