import { computed, ref, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@jetlinks-web-core/store/auth'
import { useResourceCapabilities } from '../../ResourceCenter/hooks/useResourceCapabilities'
import { useHomeNavigation } from '../shared/useHomeNavigation'
import { createDefaults } from '../shared/config'
import { HOME_TARGETS } from '../shared/navigation'
import type { HomeInfo, HomeRow, HomeTarget } from '../shared/types'
import { getPrivateOverviewAccess, PRIVATE_TARGETS } from './services/access'
import { loadPrivateResources } from './services/resources'
import { loadPrivateGuide } from './services/guide'
import { loadPrivateAlarms } from './services/alarms'
import { loadPrivateTrend } from './services/trends'
import { usePrivateQuery } from './usePrivateQuery'
import { usePrivateMonitor } from './usePrivateMonitor'
import { usePrivateCharts } from './usePrivateCharts'
import type { PrivateTrendMetric, PrivateTrendRange } from './types'

/** 私有化概览独立装配能力、分区查询与导航，不启动 SaaS 配额及旧画布订阅。 */
export function usePrivateOverview() {
  const { locale } = useI18n()
  const capabilities = useResourceCapabilities(ref(false))
  const access = computed(() => {
    void capabilities.modules.value
    return getPrivateOverviewAccess()
  })
  const ready = computed(() => !capabilities.loading.value && !capabilities.errors.value.length)
  const key = computed(() => `${capabilities.scope.value}:${locale.value}:${JSON.stringify(access.value)}`)
  const navigation = useHomeNavigation(ready, ref(false))
  const auth = useAuthStore()
  const hasResources = computed(() => ['iot', 'video', 'product', 'screen', 'message', 'ai'].some(id => access.value[id as keyof typeof access.value]))
  const hasGuide = computed(() => access.value.iot || access.value.product || access.value.video)
  const hasAlarms = computed(() => access.value.iotAlarm || access.value.videoAlarm)
  const metrics = computed<PrivateTrendMetric[]>(() => (['message', 'ai'] as const).filter(id => access.value[id]))
  const metric = ref<PrivateTrendMetric>('message')
  const range = ref<PrivateTrendRange>('today')
  watch(metrics, values => { if (values.length && !values.includes(metric.value)) metric.value = values[0] }, { immediate: true })
  const resources = usePrivateQuery(loadPrivateResources, key, computed(() => ready.value && hasResources.value))
  const guide = usePrivateQuery(loadPrivateGuide, key, computed(() => ready.value && hasGuide.value))
  const alarms = usePrivateQuery(loadPrivateAlarms, key, computed(() => ready.value && hasAlarms.value))
  const trend = usePrivateQuery(() => loadPrivateTrend(metric.value, range.value),
    computed(() => `${key.value}:${metric.value}:${range.value}`), computed(() => ready.value && metrics.value.length > 0))
  const monitor = usePrivateMonitor(computed(() => ready.value && access.value.runtime), capabilities.scope)
  const charts = usePrivateCharts(toRef(trend, 'data'), toRef(alarms, 'data'))

  // 仅复用目标页面已消费的创建参数，并按所属父菜单校验按钮权限。
  const actions = computed<HomeRow[]>(() => {
    const sceneMenu = PRIVATE_TARGETS.scene.menus.find(code => navigation.canOpen({ menus: [code] }))
    const items: Array<{ id: string; enabled: boolean; target: HomeTarget; permission?: string }> = [
      { id: 'devices', enabled: access.value.iot, target: HOME_TARGETS.addDevice, permission: 'iot-user-device-list:add' },
      ...(access.value.video ? [{ id: 'video', enabled: true, target: { menus: ['video/resources/Save'] }, permission: 'video/resources:add' }] : []),
      { id: 'product', enabled: access.value.product, target: { ...PRIVATE_TARGETS.product, params: { save: 'true' } }, permission: 'device/Product:add' },
      { id: 'scene', enabled: access.value.scene, target: { menus: ['iot-user/scene-linkage/Editor', 'rule-engine/Scene/Editor'] }, permission: `${sceneMenu}:add` },
      { id: 'gateway', enabled: access.value.gateway, target: { menus: ['link/AccessConfig/Detail'], params: { id: ':id' }, query: { view: 'false' } }, permission: 'link/AccessConfig:add' },
      ...(access.value.video ? [
        { id: 'media', enabled: access.value.media, target: PRIVATE_TARGETS.media, permission: 'media/Stream:update' },
        { id: 'task', enabled: access.value.task, target: PRIVATE_TARGETS.task },
      ] : [
        { id: 'protocol', enabled: access.value.protocol, target: { ...PRIVATE_TARGETS.protocol, query: { save: 'true' } }, permission: 'link/Protocol:add' },
        { id: 'network', enabled: access.value.network, target: { menus: ['link/Type/Detail'], params: { id: ':id' }, query: { view: 'false' } }, permission: 'link/Type:add' },
        { id: 'certificate', enabled: access.value.certificate, target: { menus: ['link/Certificate/Detail'], params: { id: ':id' }, query: { view: 'false' } }, permission: 'link/Certificate:add' },
      ]),
      { id: 'screen', enabled: access.value.screen, target: { ...PRIVATE_TARGETS.screen, query: { kind: 'screen', action: 'create' } } },
    ]
    return items.filter(item => item.enabled && navigation.canOpen(item.target) && (!item.permission || auth.hasPermission(item.permission)))
      .map(item => ({ id: item.id, icon: item.id === 'product' ? 'products' : item.id,
        labelKey: `privateOverview.action.${item.id}`, descriptionKey: `privateOverview.actionDesc.${item.id}`, target: item.target }))
  })
  // 只读账号完成引导后没有创建入口时，不保留空的快捷卡或占位列。
  const showAccess = computed(() => actions.value.length > 0 || (hasGuide.value && (!guide.data || guide.error || guide.data.show)))
  const defaults = createDefaults('Applications')
  const applicationInfo: HomeInfo = { componentProps: { projectHomeApplications: { ...defaults, chart: {
    ...defaults.chart, displayStyle: 'private', maxItems: 3, showDate: false, showDescription: true,
  } } } }
  return { capabilities, access, hasResources, hasGuide, hasAlarms, metrics, metric, range,
    resources, guide, alarms, trend, monitor, charts, actions, showAccess, applicationInfo, navigation, targets: PRIVATE_TARGETS }
}
