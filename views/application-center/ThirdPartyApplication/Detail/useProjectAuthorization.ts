import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { updateProjectAuthorization } from '@authentication-manager-ui/api/application-center/thirdPartyIntegration'
import type { AvailableApplication, ProjectIntegration } from '@authentication-manager-ui/api/application-center/thirdPartyIntegration'
import { useAuthorizationForm } from '../useAuthorizationForm'
import { integrationError, integrationState } from '../integrationUtils'

export const useProjectAuthorization = (source: () => { relation: ProjectIntegration; profile?: AvailableApplication }) => {
  const { t } = useI18n()
  const form = useAuthorizationForm(() => source().profile)
  const saving = ref(false)
  const error = ref('')
  let generation = 0
  watch(() => source().relation, relation => {
    generation++; form.reset(relation); saving.value = false; error.value = ''
  }, { immediate: true })
  onBeforeUnmount(() => { generation++ })
  const editable = computed(() => !!source().profile && integrationState(source().relation.state) === 'enabled' && source().relation.authorizationRevision > 0)
  const submit = async () => {
    if (!editable.value || saving.value || form.validation.value) return
    const relation = source().relation
    const id = generation
    saving.value = true; error.value = ''
    try {
      const value = await updateProjectAuthorization(relation.projectId, relation.id, relation.authorizationRevision, form.payload())
      if (id !== generation) return
      onlyMessage(t('ThirdPartyApplication.project.authorizationSaved'))
      return value
    } catch (cause) { if (id === generation) error.value = integrationError(cause, t) }
    finally { if (id === generation) saving.value = false }
  }
  return { ...form, editable, saving, error, submit }
}
