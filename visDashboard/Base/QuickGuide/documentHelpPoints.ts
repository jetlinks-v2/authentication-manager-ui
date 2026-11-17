import i18n from '@jetlinks-web-core/locales'
import { registerDocumentHelpPoints } from '@jetlinks-web-core/utils/documentHelpRegistry'

/** 模块加载时声明全部点位，管理页无需先访问概览才能扫描到。 */
export function registerOverviewHelpPoints() {
  registerDocumentHelpPoints([
    ['space', 'QuickGuide_step3'], ['gateway', 'QuickGuide_step1'],
    ['device', 'QuickGuide_step2'], ['algorithm', 'QuickGuide_step4'],
    ['alarm', 'QuickGuide_step5'], ['application', 'QuickGuide_step6'],
  ].map(([key, title]) => ({
    code: 'project/Overview',
    key: `quickGuide.${key}`,
    name: () => i18n.global.t(`packages.ProjectHome.${title}`),
    page: () => i18n.global.t('DocumentManagement.overview'),
    location: () => i18n.global.t('packages.ProjectHome.QuickGuide'),
  })))
}
