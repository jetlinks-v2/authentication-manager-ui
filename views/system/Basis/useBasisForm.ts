import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { omit } from 'lodash-es'
import { useRequest } from '@jetlinks-web/hooks'
import { onlyMessage } from '@jetlinks-web/utils'
import { useHeaderTheme } from '@jetlinks-web-core/hooks'
import type { BasicLayoutVariant } from '@jetlinks-web-core/layout/runtime/layoutVariant'
import { useSystemStore, type LayoutMode } from '@jetlinks-web-core/store/system'
import { resolvePublicAssetUrl } from '@jetlinks-web-core/utils'
import { save_api } from '@authentication-manager-ui/api/system/basis'
import { normalizeLayoutMode } from './layoutMode'
import type { formDataType } from './typing'
import type { BasisSectionKey } from './types'

const layoutVariantMap: Record<LayoutMode, BasicLayoutVariant> = {
  top: 'tenant',
  side: 'application',
  mix: 'project',
}

const createDefaultForm = (): formDataType => ({
  title: '',
  headerTheme: 'light',
  layout: 'side',
  layoutVariant: 'application',
  apiKey: '',
  webKey: '',
  secretKey: '',
  'base-path': `${window.location.origin}/api`,
  logo: 'images/login/logo.png',
  ico: 'favicon.ico',
  background: 'images/login/login.png',
  showRecordNumber: false,
  recordNumber: '',
})

const cloneForm = (source: formDataType): formDataType => ({
  ...source,
})

export const useBasisForm = (hideSubmitBtn: boolean) => {
  const { t } = useI18n()
  const system = useSystemStore()
  const {
    headerThemeAreas,
    normalizeHeaderTheme,
    applyHeaderTheme,
    createHeaderThemeChange,
  } = useHeaderTheme()

  const formRef = ref()
  const loading = ref(true)
  const error = ref('')
  const formData = reactive<formDataType>(createDefaultForm())
  const snapshot = ref<formDataType>(createDefaultForm())
  const editingSection = ref<BasisSectionKey>()
  const changeHeaderTheme = createHeaderThemeChange(formData)
  const sectionEditMode = computed(() => hideSubmitBtn === false)
  const canEdit = computed(() => true)
  const showBtn = computed(() => hideSubmitBtn === false && !sectionEditMode.value)

  const formRules = computed(() => ({
    title: [
      { required: true, message: t('Basis.Form.436809-1'), trigger: 'blur' },
      { max: 64, message: t('Basis.Form.436809-19') },
    ],
    headerTheme: [{ required: true }],
    layout: [{ required: true }],
  }))

  const recordNumberRules = computed(() => [
    { required: true, message: t('Basis.Form.436809-26'), trigger: 'blur' },
  ])

  const basePathRules = computed(() => [
    { required: true, message: t('Basis.Form.436809-20'), trigger: 'blur' },
  ])

  const placeholder = computed(() => t('Basis.Config.notConfigured'))
  const layoutLabels = computed<Record<LayoutMode, string>>(() => ({
    side: t('Basis.Form.436809-28'),
    top: t('Basis.Form.436809-30'),
    mix: t('Basis.Form.436809-29'),
  }))
  const sectionFields: Record<BasisSectionKey, string[]> = {
    basic: ['title', 'headerTheme', 'layout', 'showRecordNumber', 'recordNumber'],
    map: ['webKey', 'apiKey', 'base-path'],
    background: ['background'],
  }

  const applyDetails = (configInfo: typeof system.systemInfo) => {
    const layout = normalizeLayoutMode(configInfo.front?.layout)
    Object.assign(formData, {
      title: configInfo.front?.title,
      headerTheme: normalizeHeaderTheme(configInfo.front?.headerTheme),
      layout,
      layoutVariant: layoutVariantMap[layout],
      logo: configInfo.front?.logo || 'logo.png',
      ico: configInfo.front?.ico || 'favicon.ico',
      showRecordNumber: configInfo.front?.showRecordNumber || false,
      recordNumber: configInfo.front?.recordNumber,
      background: configInfo.front?.background || 'images/login/login.png',
      apiKey: configInfo.amap?.apiKey,
      webKey: configInfo.amap?.webKey,
      secretKey: configInfo.amap?.secretKey,
      'base-path': configInfo.paths?.['base-path'] || formData['base-path'],
    })
    snapshot.value = cloneForm(formData)
  }

  const loadDetails = async () => {
    loading.value = true
    error.value = ''
    editingSection.value = undefined
    try {
      await system.queryInfo()
      applyDetails(system.systemInfo)
    } catch (err) {
      error.value = err instanceof Error && err.message
        ? err.message
        : t('Basis.Config.loadFailed')
    } finally {
      loading.value = false
    }
  }

  const isEditing = (section: BasisSectionKey) => (
    !sectionEditMode.value || editingSection.value === section
  )

  const startEdit = (section: BasisSectionKey) => {
    if (!sectionEditMode.value) return
    Object.assign(formData, snapshot.value)
    editingSection.value = section
  }

  const cancelEdit = () => {
    Object.assign(formData, snapshot.value)
    editingSection.value = undefined
  }

  const displayValue = (value?: string | boolean) => {
    if (typeof value === 'boolean') {
      return value ? t('Basis.Config.enabled') : t('Basis.Config.disabled')
    }
    return value || placeholder.value
  }

  const displayTheme = computed(() => (
    headerThemeAreas.find(item => item.value === formData.headerTheme)?.label
    || displayValue(formData.headerTheme)
  ))

  const displayLayout = computed(() => layoutLabels.value[formData.layout] || displayValue(formData.layout))
  const maskedSecret = computed(() => formData.secretKey ? '••••••••' : placeholder.value)
  const logoSrc = computed(() => resolvePublicAssetUrl(formData.logo))
  const icoSrc = computed(() => resolvePublicAssetUrl(formData.ico))
  const backgroundSrc = computed(() => resolvePublicAssetUrl(formData.background))

  const { run, loading: saving } = useRequest(save_api, {
    immediate: false,
    onSuccess(res) {
      if (res.success) {
        onlyMessage(t('Basis.Form.436809-23'), 'success')
        void loadDetails()
      }
    },
  })

  const submit = () => new Promise((resolve, reject) => {
    const names = sectionEditMode.value && editingSection.value
      ? sectionFields[editingSection.value]
      : undefined
    formRef.value?.validate(names).then(() => {
      formData.layoutVariant = layoutVariantMap[formData.layout]
      const params = [
        {
          scope: 'front',
          properties: omit(formData, ['apiKey', 'webKey', 'secretKey', 'base-path']),
        },
        {
          scope: 'amap',
          properties: {
            apiKey: formData.apiKey,
            webKey: formData.webKey,
            secretKey: formData.secretKey,
          },
        },
        {
          scope: 'paths',
          properties: {
            'base-path': formData['base-path'],
          },
        },
      ]
      run(params).then((resp) => {
        if (resp.success) {
          applyHeaderTheme(formData.headerTheme)
          snapshot.value = cloneForm(formData)
          editingSection.value = undefined
        }
        resolve(true)
      }).catch(() => {
        reject(false)
      })
    }).catch((err: unknown) => {
      reject(err)
    })
  })

  onMounted(() => {
    void loadDetails()
  })

  return {
    formRef,
    formData,
    formRules,
    recordNumberRules,
    basePathRules,
    headerThemeAreas,
    loading,
    error,
    saving,
    showBtn,
    canEdit,
    sectionEditMode,
    editingSection,
    placeholder,
    displayTheme,
    displayLayout,
    maskedSecret,
    logoSrc,
    icoSrc,
    backgroundSrc,
    changeHeaderTheme,
    displayValue,
    isEditing,
    startEdit,
    cancelEdit,
    loadDetails,
    submit,
  }
}