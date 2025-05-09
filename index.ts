const routerModules = import.meta.glob('./views/**/index.vue')
import { getModuleRoutesMap } from '@jetlinks-web/utils'

/**
 * 额外子路由是独立于菜单管理之外的页面，比如详情，新增表单页；它们需要挂载在指定路由下。
 * @return
 * {
 *  'device/Product': {
 *    children: [
 *      {
 *          code: 'Detail',
 *          url: '/detail/:id',
 *          name: i18n.global.t('device-manager-ui.index.106686-0'),
 *          component: () => import('./views/device/Product/Detail/index.vue')
 *      }
 *    ]
 *  }
 * }
 */
const getExtraRoutesMap = () => ({})

const getComponents = () => ({})

export default {
  getAsyncRoutesMap: () => getModuleRoutesMap(routerModules),
  getExtraRoutesMap,
  getComponents
}
