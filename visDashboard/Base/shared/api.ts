import globalI18n from '@jetlinks-web-core/locales'
import dayjs from 'dayjs'
import {
  queryBusinessApplications,
  queryOverviewBusinessApplications,
  queryBusinessApplicationTemplates,
  type BusinessApplicationEntity,
  type BusinessApplicationTemplateEntity,
} from '@authentication-manager-ui/api/application-center/businessApplication'
import { normalizeApplication, normalizeTemplate } from '../../../views/application-center/ProjectApplication/applicationModel'
import { rowsOf, textOf } from './apiResult'
import { loadAnnouncements, loadAnnouncementUnread } from './apiAnnouncements'
import { loadResourceRows, loadOperationRows, loadHealthRows } from './apiResources'
import { loadQuotaRows } from './apiQuotas'
import { loadQuickGuideRows } from '../QuickGuide/apiQuickGuide'
import { loadSaasResourceRows } from '../Saas/services/resources'
import { loadSaasTodayRows } from '../Saas/services/today'
import type { HomeFeature, HomeRow } from './types'

const formatTime = (value?: number | string) => {
  if (!value) return globalI18n.global.t('comm.table.empty-2')
  const d = dayjs(value)
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm:ss') : String(value)
}

const loadApplications = async (overview = false): Promise<HomeRow[]> => {
  // 首页和应用列表使用相同模板类型，不能从实例的历史打开配置决定跳转。
  const sort = [{ name: 'createTime', order: 'desc' }]
  // 画布高度最多 30 行，20 条足以覆盖可展示空间；尺寸调整不重新请求。
  const applicationResponse = overview
    ? await queryOverviewBusinessApplications({ pageIndex: 0, pageSize: 20, paging: true, sorts: sort })
    : await queryBusinessApplications({ paging: false, sorts: sort })
  const applicationRows = rowsOf(applicationResponse)
  const templateIds = [...new Set(applicationRows.map(row => textOf(row.templateId)).filter(Boolean))]
  const templateResponse = overview
    ? templateIds.length ? await queryBusinessApplicationTemplates({ paging: false, terms: [{ column: 'id', termType: 'in', value: templateIds }] }) : []
    : await queryBusinessApplicationTemplates({ paging: false })
  const templates = rowsOf(templateResponse).map(row => normalizeTemplate(row as unknown as BusinessApplicationTemplateEntity))
  return applicationRows.map(row => {
    const template = templates.find(item => item.id === row.templateId)
    const application = normalizeApplication(row as unknown as BusinessApplicationEntity, template)
    const createTime = formatTime(row.createTime)
    return {
      id: textOf(row.id),
      label: textOf(row.name),
      // 与应用列表一致：优先应用描述，缺失时使用关联模板描述。
      description: application.description || template?.description,
      date: createTime,
      icon: 'applications',
      application,
      target: { menus: ['application-center/ProjectApplication'] },
    }
  })
}
export const loadHomeRows = (feature: HomeFeature): Promise<HomeRow[]> => {
  switch (feature) {
    case 'SaasResources': return loadSaasResourceRows()
    case 'SaasToday': return loadSaasTodayRows()
    case 'SaasQuotas': return loadQuotaRows(true)
    case 'SaasApplications': return loadApplications(true)
    case 'Applications': return loadApplications()
    case 'Resources': return loadResourceRows()
    case 'DeviceAccess': return loadHealthRows()
    case 'Collection': return loadResourceRows(r => r.subgroup === 'collection')
    case 'Visualization': return loadResourceRows(r => r.group === 'visualization')
    case 'AiCenter': return loadResourceRows(r => r.group === 'intelligence' && r.subgroup === 'ai')
    case 'RuleEngine': return loadResourceRows(r => r.group === 'intelligence' && r.subgroup === 'rules')
    case 'Quotas': return loadQuotaRows()
    case 'Operations': return loadOperationRows()
    case 'Announcements': return loadAnnouncements()
    case 'AnnouncementUnread': return loadAnnouncementUnread()
    case 'QuickGuide': return loadQuickGuideRows()
    default: return Promise.resolve([])
  }
}
