import { computed, onActivated, onDeactivated, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  getTemplateNotificationSignature,
  revealTemplateNotificationSignature,
  saveTemplateNotificationSignature,
  type TemplateNotificationSignatureSecret,
  type TemplateNotificationSignatureStatus,
} from '@authentication-manager-ui/api/application-center/applicationTemplate'
import { unwrapResult } from './menu-config.shared'

/** 独立维护通知签名凭据；草稿不进入普通模板表单，关闭或切换模板后清除短期材料。 */
export const useTemplateNotificationSignature = (getTemplateId: () => string) => {
  const { t } = useI18n()
  const status = ref<TemplateNotificationSignatureStatus>({ configured: false, keyId: null })
  const secret = ref<TemplateNotificationSignatureSecret>()
  const draft = ref<TemplateNotificationSignatureSecret>()
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const visible = computed(() => !!secret.value || !!draft.value)
  let revision = 0

  const close = () => {
    if (saving.value) return
    secret.value = undefined
    draft.value = undefined
  }

  const edit = () => {
    if (!getTemplateId() || loading.value || saving.value) return
    close()
    error.value = ''
    // 预先准备新 ID，接收端可在平台切换之前同时信任旧凭据与这份新凭据。
    const random = crypto.getRandomValues(new Uint8Array(16))
    const keyId = `notification-custom-v1:${Array.from(random, value => value.toString(16).padStart(2, '0')).join('')}`
    draft.value = { keyId, secret: '' }
  }

  const load = async () => {
    const id = getTemplateId()
    const current = revision
    if (!id || loading.value || saving.value) return
    loading.value = true
    error.value = ''
    try {
      const response = await getTemplateNotificationSignature(id)
      if (current === revision) {
        status.value = unwrapResult(response, { configured: false, keyId: null })
      }
    } catch {
      if (current === revision) error.value = t('ApplicationTemplate.signature.loadFailed')
    } finally {
      if (current === revision) loading.value = false
    }
  }

  const reveal = async () => {
    const id = getTemplateId()
    if (!id || saving.value || loading.value) return
    close()
    const current = revision
    saving.value = true
    error.value = ''
    try {
      const response = await revealTemplateNotificationSignature(id)
      if (current !== revision) return
      const credential = unwrapResult<TemplateNotificationSignatureSecret | undefined>(response, undefined)
      if (!credential?.keyId || !credential.secret) throw new Error('Invalid credential response')
      status.value = { configured: true, keyId: credential.keyId }
      secret.value = credential
    } catch {
      if (current === revision) error.value = t('ApplicationTemplate.signature.operationFailed')
    } finally {
      if (current === revision) saving.value = false
    }
  }

  const clear = () => {
    revision++
    saving.value = false
    close()
    status.value = { configured: false, keyId: null }
    loading.value = false
    error.value = ''
  }

  const save = async () => {
    const id = getTemplateId()
    if (!id || !draft.value || loading.value || saving.value) return false
    if (!/^[\x21-\x7e]{32,256}$/.test(draft.value.secret)) {
      error.value = t('ApplicationTemplate.signature.invalidSecret')
      return false
    }
    const current = revision
    const credential = { ...draft.value }
    saving.value = true
    error.value = ''
    try {
      const response = await saveTemplateNotificationSignature(id, credential)
      if (current !== revision) return false
      status.value = unwrapResult<TemplateNotificationSignatureStatus>(response, { configured: true, keyId: credential.keyId })
      draft.value = undefined
      secret.value = credential
      return true
    } catch {
      if (current === revision) error.value = t('ApplicationTemplate.signature.saveFailed')
      return false
    } finally {
      if (current === revision) saving.value = false
    }
  }

  watch(getTemplateId, () => {
    clear()
    void load()
  }, { immediate: true })
  onDeactivated(clear)
  onActivated(load)
  onScopeDispose(clear)

  return { status, secret, draft, loading, saving, error, visible, close, load, reveal, edit, save }
}
