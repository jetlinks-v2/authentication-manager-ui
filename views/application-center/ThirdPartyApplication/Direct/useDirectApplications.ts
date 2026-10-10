import { onBeforeUnmount, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { queryApiApplications } from '@authentication-manager-ui/api/application-center/apiApplication'
import type { ApiApplication, QueryPayload } from '@authentication-manager-ui/api/application-center/apiApplication'
import { createDirectApplication } from '@authentication-manager-ui/api/application-center/directApiApplication'
import { applicationError, responseBody } from '../applicationUtils'

export const useDirectApplications = () => {
  const { t } = useI18n()
  const menu = useMenuStore()
  const error = ref('')
  const createError = ref('')
  const saving = ref(false)
  const createOpen = ref(false)
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
  const openCreate = () => { form.name = ''; form.description = ''; createError.value = ''; createOpen.value = true }
  const create = async () => {
    if (saving.value || !form.name.trim()) return false
    saving.value = true; createError.value = ''
    try {
      await createDirectApplication(form)
      if (disposed) return false
      createOpen.value = false
      onlyMessage(t('ThirdPartyApplication.created'))
      return true
    } catch (cause) { if (!disposed) createError.value = applicationError(cause, t); return false }
    finally { if (!disposed) saving.value = false }
  }
  const openDetail = (application: ApiApplication) => menu.jumpPage('application-center/ThirdPartyApplication/Detail', {
    params: { id: application.id }, query: { tab: 'basic' },
  })
  return { error, createError, saving, createOpen, form, query, openCreate, create, openDetail }
}
