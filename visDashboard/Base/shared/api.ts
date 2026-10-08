import dayjs from 'dayjs'
import {
  queryBusinessApplications,
  queryBusinessApplicationTemplates,
  type BusinessApplicationEntity,
  type BusinessApplicationTemplateEntity,
} from '@authentication-manager-ui/api/application-center/businessApplication'
import { normalizeApplication, normalizeTemplate } from '../../../views/application-center/ProjectApplication/applicationModel'
import { rowsOf, textOf } from './apiResult'
import { loadAnnouncements } from './apiAnnouncements'
import { loadResourceRows, loadOperationRows, loadHealthRows } from './apiResources'
import { loadQuotaRows } from './apiQuotas'
import { loadQuickGuideRows } from '../QuickGuide/apiQuickGuide'
import type { HomeFeature, HomeRow } from './types'

const formatTime = (value?: number | string) => {
  if (!value) return '--'
  const d = dayjs(value)
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm:ss') : String(value)
}

const loadApplications = async (): Promise<HomeRow[]> => {
  // 首页和应用列表使用相同模板类型，不能从实例的历史打开配置决定跳转。
  const [applicationResponse, templateResponse] = await Promise.all([
    queryBusinessApplications({ paging: false, sorts: [{ name: 'createTime', order: 'desc' }] }),
    queryBusinessApplicationTemplates({ paging: false }),
  ])
  const templates = rowsOf(templateResponse).map(row => normalizeTemplate(row as unknown as BusinessApplicationTemplateEntity))
  return rowsOf(applicationResponse).map(row => {
    const application = normalizeApplication(row as unknown as BusinessApplicationEntity, templates.find(template => template.id === row.templateId))
    const createTime = formatTime(row.createTime)
    return {
      id: textOf(row.id),
      label: textOf(row.name),
      description: application.description,
      date: createTime,
      icon: 'applications',
      application,
      target: { menus: ['application-center/ProjectApplication'] },
    }
  })
}
export const loadHomeRows = (feature: HomeFeature): Promise<HomeRow[]> => {
  switch (feature) {
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
    case 'QuickGuide': return loadQuickGuideRows()
    default: return Promise.resolve([])
  }
}
