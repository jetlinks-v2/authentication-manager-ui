import { computed, ref, watch } from 'vue'
import i18n from '@jetlinks-web-core/locales'
import { useSystemStore } from '@jetlinks-web-core/store/system'
import { documentRequest } from '@jetlinks-web-core/hooks/useDocumentHelp'

// 搜索和功能点帮助共用 core 的打开命令，iframe 生命周期由顶栏唯一浮窗维护。
export { openDocument } from '@jetlinks-web-core/hooks/useDocumentHelp'

/** 文档地址由 auth 系统配置下发，浮窗与外链共用同一地址，不携带平台认证信息。 */
export function useDocumentCenter() {
  const system = useSystemStore()
  const open = ref(false)
  const articleUrl = ref('')
  const loading = ref(false)
  const failed = ref(false)
  const frameKey = ref(0)
  const configuredUrl = computed(() => {
    const value: unknown = system.systemInfo.paths?.['document-url']
    return typeof value === 'string' ? value.trim() : ''
  })
  const url = computed(() => {
    try {
      const target = new URL(configuredUrl.value)
      return ['http:', 'https:'].includes(target.protocol) ? target.href : ''
    } catch {
      return ''
    }
  })
  const frameUrl = computed(() => {
    const value = articleUrl.value || url.value
    if (!value) return ''
    const target = new URL(value)
    const locale = String(i18n.global.locale.value)
    const languages: Record<string, string> = { zh: 'zh-CN', en: 'en-US', ja: 'ja-JP' }
    target.searchParams.set('embed', '1')
    // 文档站尚不支持平台版本号匹配，暂时使用默认发布版本。
    target.searchParams.delete('version')
    target.searchParams.set('language', languages[locale] || locale)
    return target.href
  })
  const unavailable = computed(() => configuredUrl.value ? 'invalidUrl' : 'unconfigured')

  function reload() {
    failed.value = false
    loading.value = !!url.value
    frameKey.value++
  }

  function setOpen(value: boolean) {
    open.value = value
    if (value) {
      articleUrl.value = ''
      reload()
    }
    else loading.value = false
  }

  // 配置重新加载后，已打开的浮窗同步切换到新地址。
  watch(url, () => {
    articleUrl.value = ''
    if (open.value) reload()
  })

  watch(() => i18n.global.locale.value, () => {
    if (open.value) reload()
  })

  watch(documentRequest, request => {
    if (!request || !url.value) return
    const center = new URL(url.value)
    const scope = center.pathname.match(/^\/(?:s|jetlinks)\/[a-zA-Z0-9-]+(?=\/|$)/)?.[0]
    if (!scope) return
    let article: URL
    // 功能点只绑定文章路径，不硬编码部署地址；完整 URL 仍按同一范围校验。
    try { article = new URL(request.url.startsWith('/doc/') ? `${center.origin}${scope}${request.url}` : request.url) } catch { return }
    // 结果仅可打开当前文档中心下的页面，禁止任意外站或可执行 URL。
    if (article.origin !== center.origin || !article.pathname.startsWith(`${scope}/doc/`)) return
    if (!/^[^/%\\]+$/.test(article.pathname.slice(`${scope}/doc/`.length))) return
    articleUrl.value = article.href
    open.value = true
    reload()
  })

  function onLoad() {
    // 跨域 iframe 无法读取正文，load 仅用于结束加载动画。
    loading.value = false
  }

  function onError() {
    loading.value = false
    failed.value = true
  }

  return { open, loading, failed, frameKey, url, frameUrl, unavailable, setOpen, reload, onLoad, onError }
}
