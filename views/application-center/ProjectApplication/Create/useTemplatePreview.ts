import { onScopeDispose, reactive, ref, watch } from 'vue'
import { getApplicationTemplate, type ApplicationTemplateMenuGrant, type BusinessApplicationTemplate } from '@authentication-manager-ui/api/application-center/applicationTemplate'
import { getBusinessApplicationTemplateMenus } from '@authentication-manager-ui/api/application-center/businessApplication'
import { resultOf } from '../applicationModel'
import type { ApplicationTemplate } from '../types'
import { buildTemplatePreviewMenus, type TemplatePreviewMenu } from './templatePreviewModel'

export interface TemplatePreviewState {
  template?: ApplicationTemplate
  activeTab: string | number
  document: string
  documentLoading: boolean
  documentError: boolean
  menus: TemplatePreviewMenu[]
  menusLoading: boolean
  menusError: boolean
  expandedMenus: Array<string | number>
}

/** 模板预览按次读取，独立处理文档和菜单失败，关闭或切换后丢弃过期响应。 */
export const useTemplatePreview = (dialogOpen: () => boolean) => {
  const preview = reactive<TemplatePreviewState>({
    activeTab: 'document', document: '', documentLoading: false, documentError: false,
    menus: [], menusLoading: false, menusError: false, expandedMenus: [],
  })
  const previewPaneRef = ref<HTMLElement>()
  let trigger: HTMLElement | undefined
  let documentSequence = 0
  let menuSequence = 0

  const loadPreviewDocument = async () => {
    const template = preview.template
    if (!template) return
    const sequence = ++documentSequence
    preview.documentLoading = true
    preview.documentError = false
    try {
      const response = await getApplicationTemplate(template.id)
      const detail = resultOf<BusinessApplicationTemplate>(response)
      if (response?.success === false || !detail?.id) throw new Error('Invalid template detail')
      if (sequence === documentSequence) preview.document = detail.i18nDocument || detail.document || ''
    } catch {
      if (sequence === documentSequence) preview.documentError = true
    } finally {
      if (sequence === documentSequence) preview.documentLoading = false
    }
  }

  const loadPreviewMenus = async () => {
    const template = preview.template
    if (!template) return
    const sequence = ++menuSequence
    preview.menusLoading = true
    preview.menusError = false
    try {
      const response = await getBusinessApplicationTemplateMenus(template.id)
      const detail = resultOf<ApplicationTemplateMenuGrant>(response)
      if (response?.success === false || !Array.isArray(detail?.menus)) throw new Error('Invalid template menus')
      if (sequence !== menuSequence) return
      preview.menus = buildTemplatePreviewMenus(detail.menus)
      preview.expandedMenus = preview.menus.filter(menu => menu.children.length).map(menu => menu.key)
    } catch {
      if (sequence === menuSequence) preview.menusError = true
    } finally {
      if (sequence === menuSequence) preview.menusLoading = false
    }
  }

  const openPreview = (template: ApplicationTemplate) => {
    if (template.disabled) return
    trigger = typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement : undefined
    preview.template = template
    preview.activeTab = 'document'
    preview.document = ''
    preview.menus = []
    preview.expandedMenus = []
    void loadPreviewDocument()
    void loadPreviewMenus()
  }

  const closePreview = () => {
    ++documentSequence
    ++menuSequence
    preview.template = undefined
    preview.documentLoading = false
    preview.menusLoading = false
  }
  const focusPreview = () => previewPaneRef.value?.focus({ preventScroll: true })
  const restorePreviewFocus = () => {
    if (dialogOpen() && trigger?.isConnected) trigger.focus({ preventScroll: true })
    trigger = undefined
  }
  watch(dialogOpen, open => { if (!open) closePreview() })
  onScopeDispose(closePreview)

  return {
    preview, previewPaneRef, openPreview, closePreview, loadPreviewDocument, loadPreviewMenus,
    focusPreview, restorePreviewFocus,
  }
}
