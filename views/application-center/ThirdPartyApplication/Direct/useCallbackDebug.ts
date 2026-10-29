import { computed, reactive, ref, shallowRef, watch } from 'vue'
import type { Ref, UnwrapNestedRefs } from 'vue'
import { useI18n } from 'vue-i18n'
import { callbackSampleIdentity, createCallbackSample, verifyCallbackSignature } from './callbackSignature'
import type { CallbackVerification } from './callbackSignature'
import { isJsonBody } from './accessDebugUtils'
import type { RunDebugTask } from './accessDebugUtils'
import { useAccessGuide } from './useAccessGuide'

export const useCallbackDebug = (context: {
  applicationId: () => string; clientId: Readonly<Ref<string>>; clientSecret: Ref<string>;
  ready: Readonly<Ref<boolean>>; busy: Ref<boolean>; run: RunDebugTask; clearError: () => void;
}) => {
  const { t } = useI18n()
  const { signatureHeaders } = useAccessGuide()
  const source = ref<'sample' | 'received'>('sample')
  const initialized = ref(false)
  const sampleSecret = ref('')
  const form = reactive({
    headers: Object.fromEntries(signatureHeaders.value.map(header => [header.name, ''])) as Record<string, string>,
    body: '', windowSeconds: undefined as number | undefined,
  })
  const bodyFile = ref<File>()
  const fileBytes = shallowRef<Uint8Array<ArrayBuffer>>()
  const fileText = ref('')
  const fileError = ref('')
  const verification = ref<CallbackVerification>()
  const isSample = computed(() => source.value === 'sample')
  const clientId = computed(() => isSample.value ? callbackSampleIdentity.clientId : context.clientId.value)
  const secret = computed({ get: () => isSample.value ? sampleSecret.value : context.clientSecret.value,
    set: value => { if (isSample.value) sampleSecret.value = value; else context.clientSecret.value = value } })
  const sourceOptions = computed(() => (['sample', 'received'] as const).map(value => ({
    value, label: t(`ThirdPartyApplication.debug.callbackSource.${value}`), disabled: context.busy.value,
  })))
  const headers = computed(() => signatureHeaders.value.map(header => ({ ...header, required: header.name !== 'X-Platform-Id' })))
  const headerColumns = computed(() => [
    { title: t('ThirdPartyApplication.debug.headerName'), key: 'name', width: '42%' },
    { title: t('ThirdPartyApplication.debug.headerValue'), key: 'value' },
  ])
  const rawBody = computed(() => bodyFile.value ? fileText.value : form.body)
  const bodyError = computed(() => {
    if (fileError.value) return fileError.value
    if (bodyFile.value && !fileBytes.value && !context.busy.value) return t('ThirdPartyApplication.debug.fileReadError')
    return (bodyFile.value || rawBody.value) && !isJsonBody(rawBody.value) ? t('ThirdPartyApplication.debug.invalidCallbackJson') : ''
  })
  const bodyReady = computed(() => !!rawBody.value.trim() && !bodyError.value && (!bodyFile.value || !!fileBytes.value))
  const preview = computed(() => bodyReady.value ? JSON.stringify(JSON.parse(rawBody.value), null, 2) : '')
  const canVerify = computed(() => (isSample.value || context.ready.value) && !!secret.value && bodyReady.value
    && headers.value.every(header => !header.required || !!form.headers[header.name].trim())
    && Number.isSafeInteger(form.windowSeconds) && Number(form.windowSeconds) > 0)

  const clearBodyFile = () => { bodyFile.value = undefined; fileBytes.value = undefined; fileText.value = ''; fileError.value = ''; verification.value = undefined }
  const clear = () => {
    for (const name of Object.keys(form.headers)) form.headers[name] = ''
    form.body = ''; form.windowSeconds = undefined; sampleSecret.value = ''; initialized.value = false
    clearBodyFile(); verification.value = undefined
  }
  const generateSample = () => context.run(async (_signal, current) => {
    const sample = await createCallbackSample(t('ThirdPartyApplication.debug.sampleMessage'))
    if (!current()) return
    clearBodyFile()
    Object.assign(form.headers, sample.headers)
    form.body = sample.body; form.windowSeconds = sample.windowSeconds
    sampleSecret.value = callbackSampleIdentity.secret; initialized.value = true
    verification.value = undefined
  })
  const ensureSample = () => { if (isSample.value && !initialized.value && !context.busy.value) void generateSample() }
  const setSource = (value: string | number) => {
    if (context.busy.value || (value !== 'sample' && value !== 'received') || value === source.value) return
    clear(); context.clearError(); source.value = value
    ensureSample()
  }
  const chooseBodyFile = (file: File) => {
    if (context.busy.value) return false
    void context.run(async (_signal, current) => {
      clearBodyFile(); bodyFile.value = file
      const bytes = new Uint8Array(await file.arrayBuffer())
      if (!current()) return
      fileBytes.value = bytes
      try { fileText.value = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes) }
      catch { fileError.value = t('ThirdPartyApplication.debug.invalidCallbackJson') }
    })
    return false
  }
  const verify = () => context.run(async (_signal, current) => {
    verification.value = undefined
    if (!secret.value || !clientId.value) throw new Error('ThirdPartyApplication.debug.secretRequired')
    if (!bodyReady.value) throw new Error('ThirdPartyApplication.debug.invalidCallbackJson')
    // 文件直接取原字节；JSON 预览仅供查看，不作为验签输入。
    const body = bodyFile.value ? fileBytes.value! : new TextEncoder().encode(form.body)
    const result = await verifyCallbackSignature({
      applicationId: isSample.value ? callbackSampleIdentity.applicationId : context.applicationId(),
      clientId: clientId.value, secret: secret.value,
      headers: Object.entries(form.headers).map(([name, value]) => `${name}: ${value}`).join('\n'),
      body, maxSkewMs: Number(form.windowSeconds) * 1000,
    })
    if (current()) verification.value = result
  })
  watch(form, () => { verification.value = undefined })
  watch(secret, () => { verification.value = undefined })
  return { source, isSample, sourceOptions, form, clientId, secret, headers, headerColumns, bodyFile, bodyError,
    rawBody, preview, canVerify, verification, clear, ensureSample, generateSample, setSource, chooseBodyFile, clearBodyFile, verify }
}

export type CallbackDebugFormState = UnwrapNestedRefs<ReturnType<typeof useCallbackDebug>>
