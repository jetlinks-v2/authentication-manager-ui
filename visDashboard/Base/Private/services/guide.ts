import { queryOverviewIotDeviceSummary, queryOverviewChannelBreakdown } from '../../../../api/overview'
import { getPrivateOverviewAccess, PRIVATE_TARGETS } from './access'
import { queryPrivateCount } from './query'
import type { HomeTarget } from '../../shared/types'
import type { PrivateGuide, PrivateGuideLane, PrivateGuideStep } from '../types'

interface StepDefinition { id: string; labelKey: string; target: HomeTarget; load: () => Promise<number> }

/** 协议页面没有发布状态，存在协议即完成；其余配置步骤必须存在已启用项。 */
export async function loadPrivateGuide(): Promise<PrivateGuide> {
  const access = getPrivateOverviewAccess()
  const enabled = [{ column: 'state', termType: 'eq', value: 'enabled' }]
  const iot: StepDefinition[] = [], video: StepDefinition[] = []
  if (access.iot || access.product) {
    if (access.protocol) iot.push({ id: 'protocol', labelKey: 'privateOverview.protocol', target: PRIVATE_TARGETS.protocol, load: () => queryPrivateCount('/protocol/_query') })
    if (access.network) iot.push({ id: 'network', labelKey: 'privateOverview.network', target: PRIVATE_TARGETS.network, load: () => queryPrivateCount('/network/config/_query', enabled) })
    if (access.gateway) iot.push({ id: 'gateway', labelKey: 'privateOverview.gateway', target: PRIVATE_TARGETS.gateway, load: () => queryPrivateCount('/gateway/device/detail/_query', enabled) })
    if (access.product) iot.push({ id: 'product', labelKey: 'privateOverview.products', target: PRIVATE_TARGETS.product, load: () => queryPrivateCount('/device-product/_count', [{ column: 'state', termType: 'eq', value: 1 }]) })
    if (access.iot) iot.push({ id: 'device', labelKey: 'privateOverview.devices', target: PRIVATE_TARGETS.devices, load: async () => (await queryOverviewIotDeviceSummary()).total })
  }
  if (access.video) {
    if (access.media) video.push({ id: 'media', labelKey: 'privateOverview.media', target: PRIVATE_TARGETS.media, load: () => queryPrivateCount('/media/server/_query', enabled) })
    video.push({ id: 'videoAccess', labelKey: 'privateOverview.videoAccess', target: PRIVATE_TARGETS.video,
      load: () => queryPrivateCount('/media/device/_query') })
    video.push({ id: 'channels', labelKey: 'privateOverview.channels', target: PRIVATE_TARGETS.video, load: async () => (await queryOverviewChannelBreakdown('all')).reduce((sum, item) => sum + item.total, 0) })
  }
  const lanes = await Promise.all(([['iot', iot], ['video', video]] as const).filter(([, steps]) => steps.length)
    .map(async ([id, definitions]): Promise<PrivateGuideLane> => {
      const steps = await Promise.all(definitions.map(async ({ load, ...step }): Promise<PrivateGuideStep> => {
        try {
          const value = await load()
          return { ...step, value, state: value > 0 ? 'complete' : 'incomplete', actionKey: `privateOverview.guideAction.${step.id}`, next: false }
        } catch { return { ...step, state: 'unknown', actionKey: `privateOverview.guideAction.${step.id}`, next: false } }
      }))
      // 未知不是未完成；遇到未知时不越过该步骤宣称后面的步骤是“下一步”。
      const next = steps.find(step => step.state !== 'complete')
      if (next?.state === 'incomplete') next.next = true
      return { id, labelKey: `privateOverview.${id}`, steps }
    }))
  const steps = lanes.flatMap(lane => lane.steps)
  const complete = steps.filter(step => step.state === 'complete').length
  return { lanes, complete, total: steps.length, show: steps.length > 0 && complete < steps.length }
}
