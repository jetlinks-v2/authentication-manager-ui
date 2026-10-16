import { computed, onActivated, onDeactivated, onScopeDispose, ref, watch } from 'vue'
import { Modal } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  generateTemplateNotificationSignature,
  getTemplateNotificationSignature,
  revealTemplateNotificationSignature,
  rotateTemplateNotificationSignature,
  type TemplateNotificationSignatureSecret,
  type TemplateNotificationSignatureStatus,
} from '@authentication-manager-ui/api/application-center/applicationTemplate'
import { unwrapResult } from './menu-config.shared'

/** 凭据操作独立保存，只保留弹窗所需的短期内存；切换模板后丢弃旧请求结果。 */
export const useTemplateNotificationSignature = (getTemplateId: () => string) => {
  const { t } = useI18n()
  const status = ref<TemplateNotificationSignatureStatus>({ configured: false, keyId: null })
  const secret = ref<TemplateNotificationSignatureSecret>()
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const visible = computed(() => !!secret.value)
  let revision = 0
  let confirmation: ReturnType<typeof Modal.confirm> | undefined

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

  const perform = async (operation: 'generate' | 'reveal' | 'rotate') => {
    const id = getTemplateId()
    if (!id || saving.value || loading.value) return
    const current = revision
    saving.value = true
    close()
    error.value = ''
    try {
      const request = {
        generate: generateTemplateNotificationSignature,
        reveal: revealTemplateNotificationSignature,
        rotate: rotateTemplateNotificationSignature,
      }[operation]
      const response = await request(id)
      if (current !== revision) return
      const credential = unwrapResult<TemplateNotificationSignatureSecret | undefined>(response, undefined)
      if (!credential?.keyId || !credential.secret) throw new Error('Invalid credential response')
      status.value = { configured: true, keyId: credential.keyId }
      secret.value = credential
      if (operation !== 'reveal') onlyMessage(t('ApplicationTemplate.signature.saved'))
    } catch {
      if (current === revision) error.value = t('ApplicationTemplate.signature.operationFailed')
    } finally {
      if (current === revision) saving.value = false
    }
  }

  const rotate = () => {
    if (confirmation || saving.value || loading.value) return
    confirmation = Modal.confirm({
      title: t('ApplicationTemplate.signature.rotateTitle'),
      content: t('ApplicationTemplate.signature.rotateWarning'),
      okText: t('ApplicationTemplate.signature.rotate'),
      cancelText: t('ApplicationTemplate.signature.cancel'),
      okType: 'danger',
      onOk: async () => {
        await perform('rotate')
        confirmation = undefined
      },
      onCancel: () => { confirmation = undefined },
    })
  }

  const clear = () => {
    revision++
    close()
    confirmation?.destroy()
    confirmation = undefined
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

  return { status, secret, loading, saving, error, visible, close, load,
    generate: () => perform('generate'), reveal: () => perform('reveal'), rotate }
}
