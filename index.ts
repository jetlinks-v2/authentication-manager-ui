import i18n from "@jetlinks-web-core/locales";

const routerModules = import.meta.glob('./views/**/index.vue')
import { getModuleRoutesMap } from '@jetlinks-web/utils'
import { moduleRegistry } from '@jetlinks-web-core/utils/module-registry'
import type { MenuFilterDefinition, MenuItem } from '@jetlinks-web-core/types/module'
import registerSetting from './register'
import { name } from './package.json'
import './views/system/list-page.less'
import { getRegisterComponents } from './views/system/Announcement/register'

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
    ],
    'system/Department': [
      {
        code: 'positions/Detail',
        url: '/positions/Detail/:id',
        name: '职位详情'
      }
    ],
    'application-center/ProjectApplication': [
      {
        code: 'Create',
        url: '/Create',
        name: i18n.global.t('ProjectApplication.route.create')
      },
      {
        code: 'Detail',
        url: '/Detail/:id',
        name: i18n.global.t('ProjectApplication.route.detail')
      }
    ],
    'application-center/ThirdPartyApplication': [
      {
        code: 'Detail',
        url: '/Detail/:id',
        name: i18n.global.t('ThirdPartyApplication.detail'),
        component: () => import('./views/application-center/ThirdPartyApplication/Detail/index.vue')
      }
    ],
    'application-center/ApiGroup': [
      {
        code: 'Save',
        url: '/Save',
        name: i18n.global.t('ApiGroupManagement.route.save'),
        component: () => import('./views/application-center/ApiGroup/Save/index.vue')
      }
    ],
    'application-center/Template': [
      {
        code: 'Save',
        url: '/Save',
        name: i18n.global.t('ApplicationTemplate.route.save')
      }
    ]
  }
}

// 只统一本模块入口的显示名称，不改服务端菜单的归属、路由、按钮或权限。
const getMenuFilters = (): MenuFilterDefinition[] => [{
  code: 'third-party-subscription-title',
  filter: (menus) => {
    const title = i18n.global.t('ThirdPartyApplication.title')
    const renameMenu = (items: MenuItem[]): MenuItem[] => items.map(item => ({
      ...item,
      ...(item.code === 'application-center/ThirdPartyApplication' ? { name: title, i18nName: title } : {}),
      ...(item.children ? { children: renameMenu(item.children) } : {}),
    }))
    return renameMenu(menus)
  },
}]

const getComponents = () => ({})

const register = () => {
  moduleRegistry.register(name, registerSetting)
}

/**
 * 不由布局壳层统一套 `ContentPanel` 的页面：整屏看板类，页面自绘背景。
 *
 * 键为路由 `name`（即菜单 `code`）。声明在代码侧，改完随代码生效，
 * 不需要把开关写进 `baseMenu.json` 再重新初始化菜单。
 */
const getContentPanelOverrides = () => ({
  'project/Overview': false,
  'resources/Dashboard': false,
})

export default {
  getAsyncRoutesMap: () => getModuleRoutesMap(routerModules),
  getExtraRoutesMap,
  getMenuFilters,
  getComponents,
  getContentPanelOverrides,
  getRegisterComponents,
  register,
  priority: -100
}
