import { onBeforeUnmount, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { queryApiApplications, updateApiApplication } from '@authentication-manager-ui/api/application-center/apiApplication'
import type { ApiApplication, QueryPayload } from '@authentication-manager-ui/api/application-center/apiApplication'
import { createDirectApplication } from '@authentication-manager-ui/api/application-center/directApiApplication'
import { apiState, applicationError, responseBody } from '../applicationUtils'

export const useDirectApplications = () => {
  const { t } = useI18n()
  const menu = useMenuStore()
  const error = ref('')
  const formError = ref('')
  const saving = ref(false)
  const busyId = ref('')
  const formOpen = ref(false)
  const editingId = ref('')
  const form = reactive({ name: '', description: '' })
  let disposed = false
  let sequence = 0
  onBeforeUnmount(() => { disposed = true; sequence++ })
  const query = async (params: QueryPayload) => {
    const current = ++sequence
    error.value = ''
    try {
      const response = await queryApiApplications({ ...params, sorts: [{ name: 'createTime', order: 'desc' }],
        terms: [...(params.terms || []), { column: 'provider', termType: 'eq', value: 'api-application' }] })
      const page = responseBody(response)
      if (!Array.isArray(page?.data)) throw new Error('ThirdPartyApplication.project.invalidResponse')
      return response
    } catch (cause) {
      if (current === sequence) error.value = applicationError(cause, t)
      throw cause
    }
  }
  const openCreate = () => { editingId.value = ''; form.name = ''; form.description = ''; formError.value = ''; formOpen.value = true }
  const openEdit = (application: ApiApplication) => {
    editingId.value = application.id
    form.name = application.name; form.description = application.description || ''
    formError.value = ''; formOpen.value = true
  }
  const saveForm = async () => {
    if (saving.value || !form.name.trim()) return false
    saving.value = true; formError.value = ''
    const id = editingId.value
    const values = { name: form.name.trim(), description: form.description.trim() }
    try {
      if (id) await updateApiApplication(id, values)
      else await createDirectApplication(values)
      if (disposed) return false
      formOpen.value = false
      onlyMessage(t(id ? 'ThirdPartyApplication.direct.saved' : 'ThirdPartyApplication.created'))
      return true
    } catch (cause) { if (!disposed) formError.value = applicationError(cause, t); return false }
    finally { if (!disposed) saving.value = false }
  }
  const toggleState = async (application: ApiApplication) => {
    if (busyId.value) return false
    busyId.value = application.id; error.value = ''
    try {
      const state = apiState(application) === 'enabled' ? 'disabled' : 'enabled'
      await updateApiApplication(application.id, { state })
      if (disposed) return false
      onlyMessage(t('ThirdPartyApplication.direct.saved'))
      return true
    } catch (cause) { if (!disposed) error.value = applicationError(cause, t); return false }
    finally { if (!disposed) busyId.value = '' }
  }
  const openDetail = (application: ApiApplication) => menu.jumpPage('application-center/ThirdPartyApplication/Detail', {
    params: { id: application.id }, query: { tab: 'basic' },
  })
  return { error, formError, saving, busyId, formOpen, editingId, form, query, openCreate, openEdit, saveForm, openDetail, toggleState }
}
