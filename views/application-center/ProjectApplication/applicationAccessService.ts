import {
  bindCurrentUserToBusinessApplication,
  getCurrentUserBusinessApplications,
  type BusinessApplicationEntity,
} from '@authentication-manager-ui/api/application-center/businessApplication'
import { getOwnMenuThree } from '@jetlinks-web-core/api/system/menu'
import { listOf } from './applicationModel'

export const hasOwnBusinessApplicationMenu = async (applicationId: string) => {
  const response = await getOwnMenuThree({
    paging: false,
    terms: [{ column: 'owner', value: 'app' }],
    sorts: [{ name: 'sortIndex', order: 'asc' }],
  }, `business_application:${applicationId}`)
  return Array.isArray(response?.result) && response.result.length > 0
}

/**
 * 应用成员关系是打开应用的唯一准入条件；应用角色只影响进入后的菜单和功能权限。
 * 当前用户未绑定时，使用无 userId 的自助接口完成绑定，避免校验本人 user 资产权限。
 */
export const ensureBusinessApplicationMembership = async (applicationId: string) => {
  const applications = listOf<BusinessApplicationEntity>(await getCurrentUserBusinessApplications())
  if (applications.some(application => application.id === applicationId)) return false

  await bindCurrentUserToBusinessApplication(applicationId)
  return true
}
