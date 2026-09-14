import { onScopeDispose, provide, type InjectionKey } from 'vue'
import { createHomePolling } from '../../Base/shared/homePolling'
import { queryOverviewChannelSummary } from '../../../api/overview'

export const videoSummaryKey: InjectionKey<ReturnType<typeof createHomePolling>> = Symbol('resourceVideoSummary')

/** 视频卡和算法覆盖共用当前画布的视频汇总，沿用已验证的订阅调度器。 */
export function createVideoSummaryPolling() {
  return createHomePolling(async () => {
    const summary = await queryOverviewChannelSummary()
    return [{ id: 'video', value: summary.total, online: summary.online }]
  })
}
export function provideVideoSummary() {
  const polling = createVideoSummaryPolling()
  provide(videoSummaryKey, polling)
  onScopeDispose(() => polling.dispose())
}
