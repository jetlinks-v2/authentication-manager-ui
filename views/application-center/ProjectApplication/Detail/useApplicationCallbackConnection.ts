import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useAuthStore } from '@jetlinks-web-core/store'
import { getBusinessApplication, type BusinessApplicationEntity } from '@authentication-manager-ui/api/application-center/businessApplication'
import { saveApplicationCallback, testApplicationCallback, type ApplicationCallbackConfiguration, type CallbackTestResult } from '@authentication-manager-ui/api/application-center/businessApplicationCallback'
import { resultOf } from '../applicationModel'
import { useApplicationConnectionForm } from '../useApplicationConnectionForm'
import { useProjectApplication } from '../useProjectApplication'

interface ConnectionOptions {
  id: () => string
  active: () => boolean
  available: () => boolean
}

export const useApplicationCallbackConnection = (options: ConnectionOptions) => {
  const { t } = useI18n()
  const auth = useAuthStore()
  const store = useProjectApplication()
  const savedCallback = ref<ApplicationCallbackConfiguration>()
  const loading = ref(false)
  const saving = ref(false)
  const testing = ref(false)
  const error = ref('')
  const results = ref<CallbackTestResult[]>()
  const configured = computed(() => !!savedCallback.value)
  const canSave = computed(() => auth.hasPermission([
    'application-center/ProjectApplication:add', 'application-center/ProjectApplication:update', 'application-center/ProjectApplication:action',
  ]))
  const form = useApplicationConnectionForm(options.active, () => !configured.value)
  let sequence = 0
  const current = (id: string, version: number) => options.id() === id && sequence === version && options.active()
  const load = async () => {
    if (!options.active() || !options.id()) return
    const id = options.id()
    const version = ++sequence
    loading.value = true
    error.value = ''
    try {
      const application = await store.loadApplication(id)
      if (!current(id, version)) return
      savedCallback.value = application?.callback
      form.reset(savedCallback.value)
      results.value = undefined
    } catch {
      if (current(id, version)) error.value = t('ApplicationConnection.loadFailed')
    } finally {
      if (current(id, version)) loading.value = false
    }
  }
  watch(() => [options.id(), options.active()] as const, ([, active]) => {
    ++sequence
    loading.value = false
    saving.value = false
    testing.value = false
    error.value = ''
    results.value = undefined
    savedCallback.value = undefined
    form.reset()
    if (active) void load()
  }, { immediate: true })
  onBeforeUnmount(() => { ++sequence; form.clearSecret() })
  watch(form.dirty, dirty => { if (dirty) results.value = undefined })

  const persist = async (remove: boolean) => {
    if (!canSave.value || loading.value || saving.value || testing.value || error.value) return
    if (!remove && (!form.draft.enabled || !form.validate())) return
    const id = options.id()
    const version = sequence
    saving.value = true
    results.value = undefined
    try {
      // PATCH 替换 configuration；必须先读最新完整配置，保留授权及其他扩展。
      const entity = resultOf<BusinessApplicationEntity>(await getBusinessApplication(id))
      if (!current(id, version)) return
      const configuration = { ...entity.configuration }
      if (remove) delete configuration.callback
      else configuration.callback = form.payload()
      await saveApplicationCallback(id, configuration)
      if (!current(id, version)) return
      form.clearSecret()
      onlyMessage(t(remove ? 'ApplicationConnection.removed' : 'ApplicationConnection.saved'))
      const updated = await store.loadApplication(id)
      if (current(id, version)) {
        savedCallback.value = updated?.callback
        form.reset(savedCallback.value)
      }
    } catch {
      if (current(id, version)) error.value = t('ApplicationConnection.saveFailed')
    } finally {
      if (current(id, version)) saving.value = false
    }
  }
  const test = async () => {
    if (!canSave.value || !options.available() || !configured.value || form.dirty.value || loading.value || saving.value || testing.value || error.value) return
    const id = options.id()
    const version = sequence
    testing.value = true
    results.value = undefined
    try {
      const value = resultOf<CallbackTestResult[]>(await testApplicationCallback(id))
      if (current(id, version)) results.value = value
    } catch {
      if (current(id, version)) error.value = t('ApplicationConnection.testFailed')
    } finally {
      if (current(id, version)) testing.value = false
    }
  }
  const reuseSecretConfirmation = computed(() => {
    const config = savedCallback.value?.authentication.configuration
    return !!savedCallback.value?.authentication.secretConfigured && !form.draft.clientSecret.trim()
      && (form.draft.clientId !== config?.clientId || form.draft.tokenUrl !== config?.tokenUrl)
  })
  const phases = computed(() => results.value === undefined ? [] : (['token', 'callback'] as const).map(phase => ({
    phase, result: results.value?.find(item => item.phase === phase),
  })))
  const busy = computed(() => loading.value || saving.value || testing.value)
  const saveDisabled = computed(() => busy.value || !form.draft.enabled || !form.supported.value || !!form.error.value || !!error.value)
  return { form, configured, canSave, loading, saving, testing, error, phases, busy, reuseSecretConfirmation, saveDisabled, load,
    save: () => persist(false), remove: () => persist(true), test }
}
