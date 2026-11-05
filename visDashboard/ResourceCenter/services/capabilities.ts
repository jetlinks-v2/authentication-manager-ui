import type { DashboardModules } from '../../useDashboardModules'

export type ResourceCapabilities = Pick<DashboardModules, 'collection' | 'networkCards'>
