import { computed, onActivated, onDeactivated, onScopeDispose, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  getTemplateNotificationSignature,
  revealTemplateNotificationSignature,
  type TemplateNotificationSignatureSecret,
  type TemplateNotificationSignatureStatus,
} from '@authentication-manager-ui/api/application-center/applicationTemplate'
import { unwrapResult } from './menu-config.shared'

/** 显式查看当前模板派生凭据；仅保留弹窗所需的短期内存，切换模板后丢弃旧请求结果。 */
export const useTemplateNotificationSignature = (getTemplateId: () => string) => {
  const { t } = useI18n()
  const status = ref<TemplateNotificationSignatureStatus>({ configured: false, keyId: null })
  const secret = ref<TemplateNotificationSignatureSecret>()
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const visible = computed(() => !!secret.value)
  let revision = 0

  const close = () => { secret.value = undefined }

  const load = async () => {
    const id = getTemplateId()
    const current = revision
    if (!id || loading.value) return
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
    const current = revision
    saving.value = true
    close()
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
    close()
    status.value = { configured: false, keyId: null }
    loading.value = false
    saving.value = false
    error.value = ''
  }

  watch(getTemplateId, () => {
    clear()
    void load()
  }, { immediate: true })
  onDeactivated(clear)
  onActivated(load)
  onScopeDispose(clear)

  return { status, secret, loading, saving, error, visible, close, load, reveal }
}
