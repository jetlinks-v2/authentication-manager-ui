import { computed, ref, type Ref } from 'vue'
import { isSaaS } from '@jetlinks-web-core/utils/consts'
import { dashboardSources } from '@jetlinks-web-core/components/DashBoardCanvas/dashboard-sources'
import { useDashboardCatalog } from '@jetlinks-web-core/components/DashBoardCanvas/discovery'
import type { DashboardValue } from '@jetlinks-web-core/components/DashBoardCanvas'
import { kinds,typeOf,type ResourceKind } from '../../../visDashboard/ResourceCenter/shared'

const thumbnails = import.meta.glob('../../../visDashboard/ResourceCenter/*/thumbnail.svg', { eager: true,query: '?url',import: 'default' }) as Record<string,string>
const base = [
  ['EdgeNodes',0,0,3,4],['IotDevices',3,0,3,4],['VideoDevices',6,0,3,4],['Visualization',9,0,3,4],
] as const
// 私有化使用24列布局：顶部四卡各6列；快速开始(左12列)两排操作，数据采集(中6列)垂直堆叠，物联网卡(右6列)贯穿右侧；下方算法覆盖与视频播放各9列，设备分布与消息趋势各9列。
const privateLayout = [
  ['EdgeNodes', 0, 0, 6, 4], ['IotDevices', 6, 0, 6, 4], ['VideoDevices', 12, 0, 6, 4], ['Visualization', 18, 0, 6, 4],
  ['QuickStart', 0, 4, 12, 7], ['Collection', 12, 4, 6, 7], ['NetworkCards', 18, 4, 6, 25],
  ['AlgorithmCoverage', 0, 11, 9, 9], ['VideoPlaybackTrend', 9, 11, 9, 9],
  ['DeviceDistribution', 0, 20, 9, 9], ['MessageTrend', 9, 20, 9, 9],
] as const
// SaaS 使用12列双栏布局：左栏(6列)快速开始/算法覆盖/设备分布，右栏(6列)消息趋势/视频播放趋势。
const saasLayout = [
  ...base,
  ['QuickStart', 0, 4, 6, 7], ['MessageTrend', 6, 4, 6, 7],
  ['AlgorithmCoverage', 0, 11, 6, 9], ['VideoPlaybackTrend', 6, 11, 6, 18],
  ['DeviceDistribution', 0, 20, 6, 9],
] as const

/** 资源中心页面的组件发现范围与默认布局。 */
export function useResourceDashboard(preview: Ref<boolean> = ref(false)) {
  const allowed = computed(() => kinds.filter(kind => preview.value || !isSaaS || !['Collection','NetworkCards'].includes(kind)))
  const discovery = useDashboardCatalog(dashboardSources,computed(() => ({
    modules: ['authentication-manager-ui'],directories: ['visDashboard'],
    groups: ['authentication-manager-ui/visDashboard/ResourceCenter'],
    entries: allowed.value.map(kind => `authentication-manager-ui/visDashboard/ResourceCenter/${kind}`),
  })))
  const catalog = computed(() => ({ ...discovery.catalog.value,components: Object.fromEntries(Object.entries(discovery.catalog.value.components)
    .map(([type,definition]) => {
      const kind = type.replace('resourceCenter','') as ResourceKind
      return [type,{ ...definition,thumbnail: thumbnails[`../../../visDashboard/ResourceCenter/${kind}/thumbnail.svg`] }]
    })) }))
  const dashboard = computed<DashboardValue>(() => ({
    canvas: { backgroundColor: 'transparent', gridLayout: { colNum: preview.value || !isSaaS ? 24 : 12, rowHeight: 16, marginHorizontal: 18, marginVertical: 18 } },
    components: (preview.value || !isSaaS ? privateLayout : saasLayout).flatMap(([kind,x,y,w,h]) => {
      const type = typeOf(kind),definition = catalog.value.components[type]
      if (!definition) return []
      return [{ ...definition.defaultConfig,id: type,type,componentProps: { ...definition.defaultConfig.componentProps,
        gridItem: { ...definition.defaultGridItem,x,y,w,h } } }]
    }),
  }))
  return { ...discovery,catalog,dashboard }
}
