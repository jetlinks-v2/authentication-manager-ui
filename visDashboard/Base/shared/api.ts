import { getMyBusinessApplications } from '@jetlinks-web-core/api/application'
import { rowsOf, textOf } from './apiResult'
import { loadAnnouncements } from './apiAnnouncements'
import { loadResourceRows, loadOperationRows } from './apiResources'
import { loadQuotaRows } from './apiQuotas'
import type { HomeFeature, HomeRow } from './types'
const loadApplications = async (): Promise<HomeRow[]> => rowsOf(await getMyBusinessApplications()).map(row => ({
  id: textOf(row.id), label: textOf(row.name), description: textOf(row.description), icon: 'applications',
  target: { menus: ['application-center/ProjectApplication/Detail'], params: { id: textOf(row.id) } },
}))
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
