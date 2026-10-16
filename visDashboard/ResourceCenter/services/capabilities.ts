import { request } from '@jetlinks-web/core'

export interface ResourceCapabilities {
  collection: boolean
  networkCards: boolean
}

export const resourceCapabilityPaths = {
  collection: '/command-supports/service/collectorService:collector/exists',
  networkCards: '/network/flow/timeseries/enabled',
} as const

/** 能力接口必须明确返回布尔值，不能把非法响应或业务零数据当作模块缺失。 */
export function capabilityBoolean(response: unknown): boolean {
  const value = response as { success?: boolean; result?: unknown } | null
  if (value?.success !== true || typeof value.result !== 'boolean') {
    throw new Error('Invalid resource capability response')
  }
  return value.result
}

/** 仅在物联网卡自身能力路由明确不存在时返回不可用；权限、网络和服务错误向上交给重试。 */
async function loadNetworkCardsCapability() {
  try {
    const response = await request.get(resourceCapabilityPaths.networkCards, {}, { hiddenError: true })
    capabilityBoolean(response)
    // false 表示时序数据库关闭，卡管理模块依旧存在。
    return true
  } catch (error) {
    const failure = error as { response?: { status?: number }; status?: number }
    if ((failure?.response?.status ?? failure?.status) === 404) return false
    throw error
  }
}

/** 只检查前端可进入且账号有菜单权限的模块，避免无权限请求和组件轮询探测。 */
export async function loadResourceCapabilities(eligible: ResourceCapabilities): Promise<ResourceCapabilities> {
  const [collection, networkCards] = await Promise.all([
    eligible.collection
      ? request.get(resourceCapabilityPaths.collection, {}, { hiddenError: true }).then(capabilityBoolean)
      : false,
    eligible.networkCards ? loadNetworkCardsCapability() : false,
  ])
  return { collection, networkCards }
}
