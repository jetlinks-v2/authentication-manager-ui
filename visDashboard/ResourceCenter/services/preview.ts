import dayjs from 'dayjs'
import { emptyData, type ResourceData, type ResourceKind, type DeviceKind, type TimeRange } from '../shared'
import i18n from '@jetlinks-web-core/locales'

/** 样例在 isEdit 设计预览及未就绪接口的临时展示中使用。 */
export function previewData(kind: ResourceKind, deviceType: DeviceKind, timeRange: TimeRange = 'today'): ResourceData {
  const data = emptyData()
  if (['EdgeNodes', 'IotDevices', 'VideoDevices'].includes(kind)) {
    const total = kind === 'EdgeNodes' ? 10 : kind === 'IotDevices' ? 24 : 18
    const offline = kind === 'EdgeNodes' ? 2 : kind === 'IotDevices' ? 3 : 5
    data.metrics = [{ key: 'total', value: total }, { key: 'online', value: total - offline }, { key: 'offline', value: offline }]
  }
  if (kind === 'Visualization') data.metrics = ['screen', 'image', 'component', 'model', 'template'].map((key, index) => ({ key, value: [12, 356, 48, 26, 18][index] }))
  if (kind === 'Collection') data.metrics = [{ key: 'channel', value: 32 }, { key: 'channelError', value: 2 }, { key: 'collector', value: 8 }, { key: 'collectorError', value: 1 }]
  if (kind === 'NetworkCards') {
    data.metrics = [{ key: 'yesterday', value: 12697.6 }, { key: 'month', value: 364748.8 }, { key: 'year', value: 2936012.8 }]
    data.ranking = [86.4, 64.2, 42.8, 31.5, 22.1, 15.8, 9.6, 6.3].map((value, index) => ({ id: String(index), name: `1064****${3217 + index}`, value: value * 1024 }))
  }
  if (kind === 'DeviceDistribution') {
    const counts = deviceType === 'edge' ? [2,1,1,1,1,1,1,0] : deviceType === 'iot' ? [5,3,3,1,2,2,1,1] : [1,1,0,1,0,0,0,1]
    data.distribution = counts.map((value,index) => ({ id: String(index),name: i18n.global.t(`resourceDashboard.previewSpace${index}`),value }))
  }
  if (kind === 'MessageTrend') data.series = [2, 1, 0, 0, 2, 8, 40, 150, 320, 350, 410, 430, 455, 430, 560, 500, 420, 350, 290, 245, 180, 60, 20, 5]
    .map((value, index) => ({ time: `${String(index).padStart(2, '0')}:00`, value }))
  if (kind === 'AlgorithmCoverage') {
    data.algorithms = [
      { id: 'helmet', name: i18n.global.t('resourceDashboard.algorithm.helmet'), value: 4 },
      { id: 'fire', name: i18n.global.t('resourceDashboard.algorithm.fire'), value: 3 },
      { id: 'intrusion', name: i18n.global.t('resourceDashboard.algorithm.intrusion'), value: 3 },
      { id: 'loitering', name: i18n.global.t('resourceDashboard.algorithm.loitering'), value: 2 },
      { id: 'vest', name: i18n.global.t('resourceDashboard.algorithm.vest'), value: 1 },
      { id: 'unconfigured', name: i18n.global.t('resourceDashboard.algorithm.unconfigured'), value: 5, unconfigured: true },
    ]
  }
  if (kind === 'VideoPlaybackTrend') {
    if (timeRange === 'yesterday') {
      data.series = [0, 0, 0, 0, 2, 3, 5, 9, 14, 16, 20, 19, 16, 15, 17, 19, 14, 12, 7, 5, 3, 2, 1, 0]
        .map((value, index) => ({ time: `${String(index).padStart(2, '0')}:00`, value }))
    } else if (timeRange === 'today') {
      data.series = [1, 0, 0, 0, 1, 2, 4, 8, 13, 17, 19, 18, 17, 16, 17, 18, 15, 11, 8, 6, 4, 3, 2, 1]
        .map((value, index) => ({ time: `${String(index).padStart(2, '0')}:00`, value }))
    } else {
      const days = timeRange === '3d' ? 3 : timeRange === '7d' ? 7 : 30
      const baseValues = [120, 145, 168, 135, 182, 195, 154, 140, 160, 175, 190, 148, 130, 155, 170, 185, 200, 165, 150, 142, 168, 180, 192, 158, 145, 162, 178, 190, 172, 166]
      const now = dayjs()
      data.series = Array.from({ length: days }, (_, i) => {
        const d = now.subtract(days - 1 - i, 'day')
        return { time: d.format('YYYY-MM-DD'), value: baseValues[i % baseValues.length] }
      })
    }
  }
  return data
}
