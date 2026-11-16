import i18n from '@jetlinks-web-core/locales'
import { registerDocumentHelpPoints } from '@jetlinks-web-core/utils/documentHelpRegistry'

/** 模块加载时注册资源仪表盘点位，未配置的说明同样可被管理页扫描。 */
export function registerResourceDashboardHelpPoints() {
  registerDocumentHelpPoints([
    ['deviceDistribution', 'resourceDashboard.DeviceDistribution'],
    ['deviceMessages', 'resourcePage.messageTitle'],
    ['visionRanking', 'resourceDashboard.VisionTaskRanking'],
  ].map(([key, title]) => ({
    code: 'resources/Dashboard',
    key: `dashboard.${key}`,
    name: () => i18n.global.t(title),
    page: () => i18n.global.t('packages.ProjectHome.saasResourceDashboard'),
  })))
}
