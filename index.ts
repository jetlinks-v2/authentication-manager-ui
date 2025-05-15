import i18n from "@/locales";

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
const getExtraRoutesMap = () => {
  return {
    'system/Role': [{ // 角色管理
      code: 'Detail',
      url: '/Detail/:id',
      name: i18n.global.t('router.extraMenu.260658-0')
    }],
    'system/Menu': [
      {
        code: 'Setting',
        url: '/Setting',
        name: i18n.global.t('router.extraMenu.260658-1')
      },
      {
        code: 'Detail',
        url: '/Detail/:id',
        name: i18n.global.t('router.extraMenu.260658-2')
      },
    ],
    'system/Apply': [
      {
        code: 'Save',
        url: '/Save',
        name: i18n.global.t('router.extraMenu.260658-3')
      },
      {
        code: 'View',
        url: '/View',
        name: i18n.global.t('Apply.index.483342-20')
      },
      {
        code: 'Api',
        url: '/Api',
        name: i18n.global.t('Apply.index.483342-19')
      },
    ],
    'system/Positions': [
      {
        code: 'Detail',
        url: '/Detail/:id',
        name: i18n.global.t('router.extraMenu.260658-3')
      }
    ]
  }
}

const getComponents = () => ({})

const getDefaultRoutes = () => [
  {
    path: '/init-home',
    name: 'init-home',
    component: () => import("./views/init-home/index.vue"),
    meta: {
      title: "初始化",
    },
  }
]

export default {
  getAsyncRoutesMap: () => getModuleRoutesMap(routerModules),
  getExtraRoutesMap,
  getComponents,
  getDefaultRoutes
}
