import dayjs from 'dayjs'
import {
  queryBusinessApplications,
  type BusinessApplicationEntity,
} from '@authentication-manager-ui/api/application-center/businessApplication'
import { normalizeApplication } from '../../../views/application-center/ProjectApplication/applicationModel'
import { rowsOf, textOf } from './apiResult'
import { loadAnnouncements } from './apiAnnouncements'
import { loadResourceRows, loadOperationRows } from './apiResources'
import { loadQuotaRows } from './apiQuotas'
import type { HomeFeature, HomeRow } from './types'

const formatTime = (value?: number | string) => {
  if (!value) return '--'
  const d = dayjs(value)
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm:ss') : String(value)
}

const loadApplications = async (): Promise<HomeRow[]> => {
  const applicationResponse = await queryBusinessApplications({ paging: false, sorts: [{ name: 'createTime', order: 'desc' }] })
  return rowsOf(applicationResponse).map(row => {
    const application = normalizeApplication(row as BusinessApplicationEntity)
    const createTime = formatTime(row.createTime)
    return {
      id: textOf(row.id),
      label: textOf(row.name),
      description: createTime,
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
    case 'Quotas': return loadQuotaRows()
    case 'Operations': return loadOperationRows()
    case 'Announcements': return loadAnnouncements()
    default: return Promise.resolve([])
  }
}
