import { isPrivateDeployment } from '@jetlinks-web-core/utils/deployment'
import { isProjectRuntime } from '@jetlinks-web-core/utils/project-runtime'
import { isFromCloud } from '@jetlinks-web-core/utils/request-context'

/** 仅 SaaS 管理端编排跨区域投递；私有化、项目及云侧代理只操作当前运行时。 */
export const isSaasAnnouncementManagement = () => (
  !isPrivateDeployment() && !isProjectRuntime() && !isFromCloud()
)
