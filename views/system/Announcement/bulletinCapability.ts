import { hasCommandService } from '@jetlinks-web-core/api/commandSupports'
import { getAnnouncementReadScope } from './localReadStore'

let probe: { scope: string; result: Promise<boolean> } | undefined

/**
 * 公告命令服务与 HTTP/WS 入口受同一后端开关控制。
 * 读取服务声明，不读取会被 bulletin:save 权限过滤的命令元数据，接收者不需要发布权限。
 * 当前服务和账号共用一次探测；网络失败不缓存，迟到结果不能启用新身份的公告。
 */
export const isAnnouncementSupported = (): Promise<boolean> => {
  const scope = getAnnouncementReadScope()
  if (!scope) {
    probe = undefined
    return Promise.resolve(false)
  }
  if (probe?.scope === scope) return probe.result
  const entry = { scope, result: Promise.resolve(false) }
  entry.result = hasCommandService('notifyService:bulletin')
    .then(supported => scope === getAnnouncementReadScope() && supported)
    .catch(() => {
      if (probe === entry) probe = undefined
      return false
    })
  probe = entry
  return entry.result
}
