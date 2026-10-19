import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { connectProjectApplication } from '@authentication-manager-ui/api/application-center/thirdPartyIntegration'
import type { AvailableApplication } from '@authentication-manager-ui/api/application-center/thirdPartyIntegration'
import { useAuthorizationForm } from './useAuthorizationForm'
import { integrationError } from './integrationUtils'

export const useConnectApplication = (options: () => { open: boolean; projectId: string; applications: AvailableApplication[] }) => {
  const { t } = useI18n()
  const profileId = ref('')
  const profile = computed(() => options().applications.find(item => item.appId === profileId.value))
  const form = useAuthorizationForm(profile)
  const saving = ref(false)
  const error = ref('')
  let generation = 0
  watch(() => [options().open, options().projectId], () => {
    generation++; profileId.value = ''; form.reset(); error.value = ''; saving.value = false
  })
  watch(profileId, () => { form.reset(); error.value = '' })
  onBeforeUnmount(() => { generation++ })
  const submit = async () => {
    if (saving.value || !options().projectId || !profile.value || form.validation.value) return
    const current = generation
    saving.value = true; error.value = ''
    try {
      const result = await connectProjectApplication(options().projectId, profile.value.appId, form.payload())
      if (current !== generation) return
      onlyMessage(t('ThirdPartyApplication.project.connected'))
      return result
    } catch (cause) { if (current === generation) error.value = integrationError(cause, t) }
    finally { if (current === generation) saving.value = false }
  }
  return { ...form, profileId, profile, saving, error, submit }
}
