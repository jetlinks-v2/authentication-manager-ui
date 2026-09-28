import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { HOME_TARGETS } from '../shared/navigation'
import { useHomeRuntime } from '../shared/useHomeRuntime'
import type { createHomePolling } from '../shared/homePolling'
import type { GuideStep } from './components/HomeView.vue'
import { resolveGuideStatuses, shouldShowGuide } from './quickGuideStatus'

export function useQuickGuideSteps(isEdit: () => boolean, polling?: ReturnType<typeof createHomePolling>) {
  const { t } = useI18n()
  const menuStore = useMenuStore()
  const resolveMenu = (step: Pick<GuideStep, 'target'>) => step.target.menus.find(code => menuStore.getMenu(code))
  const edit = computed(isEdit)
  const refreshTime = ref(60)
  const health = useHomeRuntime('DeviceAccess', edit, refreshTime, undefined, polling)
  const algorithms = useHomeRuntime('AiCenter', edit, refreshTime, undefined, polling)
  const space = useHomeRuntime('QuickGuide', edit, refreshTime, undefined, polling)

  const statuses = computed(() => resolveGuideStatuses(
    { rows: health.rows.value, loading: health.loading.value },
    { rows: algorithms.rows.value, loading: algorithms.loading.value },
    { rows: space.rows.value, loading: space.loading.value },
    isEdit(),
  ))
  // 等待首次查询得出可操作的结果，避免全部已配置时卡片短暂出现后消失。
  const showGuide = computed(() => shouldShowGuide(statuses.value))

  const steps = computed<GuideStep[]>(() => [
    {
      key: 'gateway',
      title: t('packages.ProjectHome.QuickGuide_step1'),
      description: t('packages.ProjectHome.QuickGuide_step1_desc'),
      actionText: t('packages.ProjectHome.QuickGuide_step1_action'),
      target: { ...HOME_TARGETS.gateway, query: { type: 'gateway', action: 'create' } },
    },
    {
      key: 'device',
      title: t('packages.ProjectHome.QuickGuide_step2'),
      description: t('packages.ProjectHome.QuickGuide_step2_desc'),
      actionText: t('packages.ProjectHome.QuickGuide_step2_action'),
      target: HOME_TARGETS.addDevice,
    },
    {
      key: 'space',
      title: t('packages.ProjectHome.QuickGuide_step3'),
      description: t('packages.ProjectHome.QuickGuide_step3_desc'),
      actionText: t('packages.ProjectHome.QuickGuide_step3_action'),
      target: { ...HOME_TARGETS.space, query: { action: 'create' } },
    },
    {
      key: 'algorithm',
      title: t('packages.ProjectHome.QuickGuide_step4'),
      description: t('packages.ProjectHome.QuickGuide_step4_desc'),
      actionText: t('packages.ProjectHome.QuickGuide_step4_action'),
      target: HOME_TARGETS.algorithm,
    },
  ].map(step => {
    const status = statuses.value[step.key]
    return { ...step, status, statusText: t(`packages.ProjectHome.QuickGuide_status_${status}`), disabled: !isEdit() && !resolveMenu(step) }
  }))

  function handleAction(step: GuideStep) {
    if (isEdit() || step.disabled) return
    const menu = resolveMenu(step)
    if (menu) menuStore.jumpPage(menu, { params: step.target.params, query: step.target.query })
  }

  return { steps, showGuide, handleAction }
}
