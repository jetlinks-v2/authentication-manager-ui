import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useNow } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import type { editor } from 'monaco-editor'
import { queryApiGrants, queryApiGroups } from '@authentication-manager-ui/api/application-center/apiApplication'
import type { ApiApplication } from '@authentication-manager-ui/api/application-center/apiApplication'
import { queryCredentialProviders, queryCredentials, revealCredential } from '@authentication-manager-ui/api/application-center/applicationCredential'
import type { ApplicationCredential, CredentialProvider } from '@authentication-manager-ui/api/application-center/applicationCredential'
import { applicationDebugUrl, sendApplicationDebugRequest } from '@authentication-manager-ui/api/application-center/applicationDebug'
import type { DebugHttpResponse } from '@authentication-manager-ui/api/application-center/applicationDebug'
import { apiState, applicationError, responseBody } from '../applicationUtils'
import { apiDebugUrl, displayDebugResponse, grantedDebugApis, isJsonBody, parseDebugToken, pathParameters, redactDebugText } from './accessDebugUtils'
import type { AccessDebugMode, ApplicationLogFilter, DebugApi, DebugParameter, DebugToken } from './accessDebugUtils'
import { useCallbackDebug } from './useCallbackDebug'

const credentialType = 'oauth2-client-secret'

export const useAccessDebug = (context: { application: ApiApplication; initialMode?: AccessDebugMode }) => {
  const { t } = useI18n()
  const now = useNow({ interval: 1000 })
  const mode = ref<AccessDebugMode>(context.initialMode || 'token')
  const loading = ref(false)
  const metadataError = ref('')
  const error = ref('')
  const busy = ref(false)
  const provider = ref<CredentialProvider>()
  const credential = ref<ApplicationCredential>()
  const clientSecret = ref('')
  const token = ref<DebugToken>()
  const tokenResponse = ref<DebugHttpResponse>()
  const callResponse = ref<DebugHttpResponse>()
  const callAddress = ref('')
  const callLogFilter = ref<ApplicationLogFilter>()
  const catalogLoading = ref(false)
  const catalogError = ref('')
  let catalogLoaded = false
  const apis = ref<DebugApi[]>([])
  const apiId = ref<string>()
  const paths = ref<DebugParameter[]>([])
  const query = ref<DebugParameter[]>([])
  const body = ref('')
  const contentType = ref('application/json')
  let generation = 0
  let operation = 0
  let controller: AbortController | undefined
  let disposed = false

  const applicationEnabled = computed(() => apiState(context.application) === 'enabled')
  const clientId = computed(() => credential.value?.clientId || '')
  const credentialActive = computed(() => credential.value?.state === 'active')
  const canReveal = computed(() => credentialActive.value && provider.value?.features?.includes('reveal'))
  const tokenValid = computed(() => !!token.value && token.value.expiresAt > now.value.getTime())
  const selectedApi = computed(() => apis.value.find(api => api.id === apiId.value))
  const requiresConfirmation = computed(() => !!selectedApi.value && !['GET', 'HEAD', 'OPTIONS'].includes(selectedApi.value.method))
  const hasBody = computed(() => !!selectedApi.value && !['GET', 'HEAD'].includes(selectedApi.value.method))
  const requestBodyError = computed(() => hasBody.value && contentType.value === 'application/json' && body.value
    && !isJsonBody(body.value) ? t('ThirdPartyApplication.debug.invalidJson') : '')
  const sendDisabled = computed(() => busy.value || !selectedApi.value || !tokenValid.value || !applicationEnabled.value || !!requestBodyError.value)
  const modes = computed(() => (['token', 'call', 'callback'] as const).map(value => ({ value, label: t(`ThirdPartyApplication.debug.mode.${value}`), disabled: busy.value })))
  const endpoint = computed(() => {
    if (!provider.value?.tokenEndpoint) return ''
    try { return applicationDebugUrl(provider.value.tokenEndpoint).href } catch { return '' }
  })
  const ready = computed(() => !loading.value && !metadataError.value && !!clientId.value)
  const response = computed(() => mode.value === 'token' ? tokenResponse.value : callResponse.value)
  const setMode = (value: string | number) => {
    if (!busy.value && (value === 'token' || value === 'call' || value === 'callback')) mode.value = value
  }
  const secrets = () => [clientSecret.value, token.value?.value || '']
  const messageOf = (cause: unknown) => cause instanceof TypeError
    ? t('ThirdPartyApplication.debug.networkError') : redactDebugText(applicationError(cause, t), secrets())

  const clearToken = () => { token.value = undefined; tokenResponse.value = undefined; callResponse.value = undefined; callAddress.value = ''; callLogFilter.value = undefined }
  const cancel = () => {
    operation++
    controller?.abort(); controller = undefined; busy.value = false
  }
  const clearSensitive = () => {
    cancel(); clearToken(); clientSecret.value = ''; callbackDebug.clear(); body.value = ''; query.value = []
  }
  const run = async (action: (signal: AbortSignal, current: () => boolean) => Promise<void>) => {
    if (busy.value) return
    error.value = ''; busy.value = true
    const id = ++operation
    const local = new AbortController()
    controller = local
    const current = () => !disposed && id === operation && !local.signal.aborted
    try { await action(local.signal, current) }
    catch (cause) { if (current()) error.value = messageOf(cause) }
    finally { if (current()) { busy.value = false; controller = undefined } }
  }
  const callbackDebug = useCallbackDebug({
    applicationId: () => context.application.id, clientId, clientSecret, ready, busy, run,
    clearError: () => { error.value = '' },
  })
  const callbackForm = reactive(callbackDebug)
  const { verification, isSample: callbackIsSample } = callbackDebug
  const setCredentialSecret = (value: string, callback = false) => {
    if (callback) callbackForm.secret = value
    else clientSecret.value = value
  }
  const initBodyEditor = (instance: editor.IStandaloneCodeEditor) => {
    instance.updateOptions({ readOnly: busy.value })
    const stop = watch(busy, value => instance.updateOptions({ readOnly: value }))
    instance.onDidDispose(stop)
  }

  const loadMetadata = async () => {
    const current = ++generation
    clearSensitive(); loading.value = true; metadataError.value = ''; provider.value = undefined; credential.value = undefined
    catalogLoading.value = false; catalogError.value = ''; catalogLoaded = false; apis.value = []; apiId.value = undefined
    try {
      const [providerResponse, credentialResponse] = await Promise.all([queryCredentialProviders(), queryCredentials(context.application.id)])
      if (disposed || current !== generation) return
      provider.value = responseBody(providerResponse).find(value => value.type === credentialType)
      credential.value = responseBody(credentialResponse).find(value => value.type === credentialType)
    } catch (cause) { if (!disposed && current === generation) metadataError.value = applicationError(cause, t) }
    finally {
      if (!disposed && current === generation) {
        loading.value = false
        if (!metadataError.value && mode.value === 'call') void loadCatalog()
      }
    }
  }
  const loadCatalog = async () => {
    if (catalogLoading.value) return
    const current = generation
    catalogLoaded = true
    catalogLoading.value = true; catalogError.value = ''; apis.value = []; apiId.value = undefined
    try {
      const [groups, grants] = await Promise.all([
        queryApiGroups({ paging: false, terms: [{ column: 'status', termType: 'eq', value: 'enabled' }] }),
        queryApiGrants(context.application.id),
      ])
      if (!disposed && current === generation) {
        apis.value = grantedDebugApis(responseBody(groups), responseBody(grants))
        // 首个已授权接口仅用于展示参数和文档，不自动发送请求。
        apiId.value = apis.value[0]?.id
      }
    } catch (cause) { if (!disposed && current === generation) catalogError.value = applicationError(cause, t) }
    finally { if (!disposed && current === generation) catalogLoading.value = false }
  }
  const useCurrentCredential = () => run(async (_signal, current) => {
    if (!canReveal.value) return
    const revealed = await revealCredential(context.application.id, credentialType)
    if (!current()) return
    // 密钥查看响应不含 state，启用状态继续使用凭据查询结果。
    clientSecret.value = revealed.clientSecret
  })

  const requireSecret = () => {
    if (!clientId.value || !clientSecret.value) throw new Error('ThirdPartyApplication.debug.secretRequired')
  }
  const acquireToken = () => run(async (signal, current) => {
    requireSecret()
    if (!applicationEnabled.value || !credentialActive.value) throw new Error('ThirdPartyApplication.debug.enableFirst')
    if (!provider.value?.tokenEndpoint) throw new Error('ThirdPartyApplication.debug.invalidAddress')
    clearToken()
    const response = await sendApplicationDebugRequest({
      url: applicationDebugUrl(provider.value.tokenEndpoint), method: 'POST', signal,
      contentType: 'application/x-www-form-urlencoded',
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId.value, client_secret: clientSecret.value }),
    })
    if (!current()) return
    if (response.ok) {
      try { token.value = parseDebugToken(response.body) }
      catch { error.value = t('ThirdPartyApplication.debug.invalidTokenResponse') }
    }
    tokenResponse.value = displayDebugResponse({ ...response, ok: response.ok && !!token.value }, secrets())
  })

  const sendApi = () => run(async (signal, current) => {
    if (!applicationEnabled.value) throw new Error('ThirdPartyApplication.debug.enableFirst')
    if (!token.value || token.value.expiresAt <= Date.now()) throw new Error('ThirdPartyApplication.debug.tokenRequired')
    const api = selectedApi.value
    if (!api) throw new Error('ThirdPartyApplication.debug.apiRequired')
    const url = apiDebugUrl(api, paths.value, query.value)
    if (requestBodyError.value) throw new Error('ThirdPartyApplication.debug.invalidJson')
    callResponse.value = undefined
    callLogFilter.value = undefined
    const startedAt = Date.now()
    callAddress.value = redactDebugText(`${api.method} ${url.href}`, secrets())
    const response = await sendApplicationDebugRequest({
      url, method: api.method, token: token.value.value, signal,
      ...(hasBody.value && body.value ? { body: body.value, contentType: contentType.value } : {}),
    })
    if (!current()) return
    callResponse.value = displayDebugResponse(response, secrets())
    callLogFilter.value = {
      path: url.pathname.slice(applicationDebugUrl('/').pathname.length - 1),
      method: api.method,
      timeRange: [startedAt - 60_000, Date.now() + 60_000],
    }
    if (response.status === 401) token.value = undefined
  })

  const addQuery = () => query.value.push({ name: '', value: '' })
  const removeQuery = (index: number) => query.value.splice(index, 1)

  watch(clientSecret, clearToken, { flush: 'sync' })
  watch(selectedApi, api => { paths.value = pathParameters(api?.path || ''); query.value = []; body.value = ''; contentType.value = 'application/json' })
  watch([paths, query, body, contentType], () => { callResponse.value = undefined; callAddress.value = ''; callLogFilter.value = undefined }, { deep: true })
  watch(mode, value => { error.value = ''; if (value === 'call' && !loading.value && !catalogLoaded) void loadCatalog() })
  watch([mode, loading], ([value, pending]) => { if (value === 'callback' && !pending) callbackDebug.ensureSample() })
  watch(applicationEnabled, enabled => {
    if (!enabled) {
      clearSensitive()
      if (mode.value === 'callback' && !loading.value) callbackDebug.ensureSample()
    }
  })
  watch(() => context.application.id, loadMetadata, { immediate: true })
  onBeforeUnmount(() => { disposed = true; generation++; clearSensitive() })

  return { mode, setMode, modes, loading, metadataError, error, busy, provider, credential, clientId, clientSecret,
    applicationEnabled, credentialActive, canReveal, ready, endpoint, token, tokenValid, response, callAddress, callLogFilter,
    apiId, apis, selectedApi, paths, query, body, contentType, hasBody, requiresConfirmation, requestBodyError, sendDisabled,
    catalogLoading, catalogError, callbackForm, callbackIsSample, verification, initBodyEditor,
    loadMetadata, loadCatalog, useCurrentCredential, acquireToken, sendApi, cancel, setCredentialSecret, addQuery, removeQuery }
}
