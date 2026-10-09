import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { changeIntegrationState } from '@authentication-manager-ui/api/application-center/thirdPartyIntegration'
import type { IntegrationAction } from '@authentication-manager-ui/api/application-center/thirdPartyIntegration'
import { integrationError, reasonValid } from './integrationUtils'

export const useIntegrationState = (action: () => IntegrationAction | undefined) => {
  const { t } = useI18n()
  const reason = ref('')
  const saving = ref(false)
  const error = ref('')
  let sequence = 0
  watch(action, () => { sequence++; reason.value = ''; error.value = ''; saving.value = false })
  onBeforeUnmount(() => { sequence++ })
  const valid = computed(() => reasonValid(reason.value))
  const title = computed(() => t('ThirdPartyApplication.project.' + (action()?.activateApi ? 'enableApi' : 'action.' + action()?.state)))
  const submit = async () => {
    const current = action()
    if (!current || saving.value || !valid.value) return
    const id = sequence
    saving.value = true; error.value = ''
    try {
      const result = await changeIntegrationState(current, reason.value.trim())
      if (id !== sequence) return
      onlyMessage(t('ThirdPartyApplication.project.stateSaved'))
      return result
    } catch (cause) { if (id === sequence) error.value = integrationError(cause, t) }
    finally { if (id === sequence) saving.value = false }
  }
  return { reason, saving, error, valid, title, submit }
}
