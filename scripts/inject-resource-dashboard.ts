import { createVNode,render,type App } from 'vue'
import ResourceDashboardPreview from './ResourceDashboardPreview.vue'

/** 开发浏览器控制台临时注入入口；复用当前应用上下文，不增加路由或保存仪表盘配置。 */
export function mountResourceDashboard(options: { readOnly?: boolean; withinPage?: boolean } = {}) {
  const appRoot = document.querySelector<HTMLElement>('#app')
  const app = (appRoot as (HTMLElement & { __vue_app__?: App }) | null)?.__vue_app__
  if (!appRoot || !app) throw new Error('Open a logged-in project page before mounting the preview')
  if (document.querySelector('#resource-dashboard-validation')) throw new Error('Preview is already mounted')
  const host = document.createElement('div')
  host.id = 'resource-dashboard-validation'
  const target = options.withinPage ? document.querySelector<HTMLElement>('.resource-dashboard') : document.body
  if (!target) throw new Error('Open the resource dashboard page before mounting an inline preview')
  const vnode = createVNode(ResourceDashboardPreview, { readOnly: options.readOnly ?? false })
  vnode.appContext = app._context
  // 页内预览保留导航与侧栏，仅临时隐藏原画布，退出时按原值恢复。
  const hidden = (options.withinPage ? Array.from(target.children) : [appRoot])
    .filter((element): element is HTMLElement => element instanceof HTMLElement)
    .map(element => ({ element,display: element.style.display }))
  hidden.forEach(({ element }) => { element.style.display = 'none' })
  target.appendChild(host)
  render(vnode,host)
  // 调用返回的清理函数会卸载组件、停止轮询并恢复原页面。
  return () => { render(null,host);host.remove();hidden.forEach(({ element,display }) => { element.style.display = display }) }
}
