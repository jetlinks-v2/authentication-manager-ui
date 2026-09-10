import {
  queryBusinessApplications,
  queryBusinessApplicationTemplates,
} from '@authentication-manager-ui/api/application-center/businessApplication'
import { rowsOf, textOf } from './apiResult'
import { loadAnnouncements } from './apiAnnouncements'
import { loadResourceRows, loadOperationRows } from './apiResources'
import { loadQuotaRows } from './apiQuotas'
import type { HomeFeature, HomeRow } from './types'
const loadApplications = async (): Promise<HomeRow[]> => {
  const [applicationResponse, templateResponse] = await Promise.all([
    queryBusinessApplications({ paging: false, sorts: [{ name: 'createTime', order: 'desc' }] }),
    queryBusinessApplicationTemplates({ paging: false }),
  ])
  const templateDescriptions = new Map(rowsOf(templateResponse).map(template => [
    textOf(template.id),
    textOf(template.description),
  ]))
  return rowsOf(applicationResponse).map(row => ({
    id: textOf(row.id), label: textOf(row.name),
    description: textOf(row.description) || templateDescriptions.get(textOf(row.templateId)) || '',
    icon: 'applications',
    target: { menus: ['application-center/ProjectApplication/Detail'], params: { id: textOf(row.id) } },
  }))
}
export const loadHomeRows = (feature: HomeFeature): Promise<HomeRow[]> => {
  switch (feature) {
    case 'Applications': return loadApplications()
    case 'Resources': return loadResourceRows()
    case 'Quotas': return loadQuotaRows()
    case 'Operations': return loadOperationRows()
    case 'Announcements': return loadAnnouncements()
    default: return Promise.resolve([])
  }
}
