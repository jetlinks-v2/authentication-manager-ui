import { computed, nextTick, reactive, ref, watch } from 'vue'
import type { FormInstance } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { useProjectApplication } from '../useProjectApplication'
import type { ProjectApplication, ProjectApplicationDraft } from '../types'

interface ApplicationCreateOptions {
  open: () => boolean
  embedded: () => boolean
  onOpenChange: (open: boolean) => void
  onCreated: (application: ProjectApplication) => void
}

/** 管理应用创建草稿、模板加载和提交，不依赖项目上下文。 */
export const useApplicationCreate = (options: ApplicationCreateOptions) => {
  const { t: $t } = useI18n()
  const menuStore = useMenuStore()
  const store = useProjectApplication()
  const formRef = ref<FormInstance>()
  const submitting = ref(false)
  const templatesLoading = ref(false)
  const form = reactive<ProjectApplicationDraft>({ name: '', description: '', templateId: '' })
  const iconTypes = ['image/jpeg', 'image/png']
  const iconUploadBorderStyle = {
    border: '1px dashed var(--line-strong)',
    borderRadius: 'var(--r-2)',
  }
  const iconCropperProps = {
    fixedNumber: [1, 1],
    autoCropWidth: 256,
    autoCropHeight: 256,
  }

  // Keep the legacy Create route usable while the ledger owns the normal dialog state.
  const dialogOpen = computed({
    get: () => options.embedded() ? options.open() : true,
    set: value => {
      if (options.embedded()) options.onOpenChange(value)
      else if (!value) menuStore.jumpPage('application-center/ProjectApplication', {})
    },
  })

  const canSubmit = computed(() => {
    const template = store.templates.find(item => item.id === form.templateId)
    return !!form.name.trim() && !!template && !template.disabled
  })

  const rules = computed(() => ({
    name: [
      { required: true, message: $t('ProjectApplication.create.nameRequired') },
      { max: 30, message: $t('ProjectApplication.create.nameLength') },
    ],
    templateId: [{ required: true, message: $t('ProjectApplication.create.templateRequired') }],
  }))

  /** 每次打开弹窗时重置草稿和校验结果。 */
  const resetForm = async () => {
    form.name = ''
    form.description = ''
    form.templateId = ''
    form.icon = undefined
    await nextTick()
    formRef.value?.clearValidate()
  }

  /** 加载可选模板，沿用统一请求错误提示。 */
  const loadTemplates = async () => {
    templatesLoading.value = true
    try {
      await store.loadTemplates()
    } catch {
      // The shared request layer reports the backend error.
    } finally {
      templatesLoading.value = false
    }
  }

  watch(dialogOpen, open => {
    if (!open) return
    void resetForm()
    void loadTemplates()
  }, { immediate: true })

  /** 关闭内嵌弹窗或返回应用列表。 */
  const closeDialog = () => {
    dialogOpen.value = false
  }

  /** 校验并创建应用，完成后通知列表或进入详情。 */
  const submit = async () => {
    if (submitting.value || !canSubmit.value) return
    try {
      await formRef.value?.validate()
    } catch {
      return
    }

    submitting.value = true
    try {
      const application = await store.createApplication({
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
      })
      onlyMessage($t('ProjectApplication.create.success', { name: application.name }))
      options.onCreated(application)
      if (options.embedded()) dialogOpen.value = false
      else menuStore.jumpPage('application-center/ProjectApplication/Detail', { params: { id: application.id } })
    } finally {
      submitting.value = false
    }
  }

  return {
    store,
    formRef,
    submitting,
    templatesLoading,
    form,
    iconTypes,
    iconUploadBorderStyle,
    iconCropperProps,
    dialogOpen,
    canSubmit,
    rules,
    closeDialog,
    submit,
  }
}
