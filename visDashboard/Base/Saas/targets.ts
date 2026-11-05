import type { HomeTarget } from '../shared/types'

/** 资源概况仅保留当前仪表盘入口。 */
export const SAAS_TARGETS: Record<string, HomeTarget> = {
  dashboard: { menus: ['resources/Dashboard'] },
}
