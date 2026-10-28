import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMenuStore } from '@jetlinks-web-core/store/menu'
import { isPrivateDeployment } from '@jetlinks-web-core/utils/deployment'
import { HOME_TARGETS } from '../shared/navigation'
import { useHomeRuntime } from '../shared/useHomeRuntime'
import type { createHomePolling } from '../shared/homePolling'
import type { GuideStep } from './components/HomeView.vue'
import { guideStepAvailable, resolveGuideStatuses, shouldShowGuide } from './quickGuideStatus'
import { useDashboardModules } from '../../useDashboardModules'

/** 组合快速上手的真实配置状态与菜单权限；展示顺序不改变业务状态和跳转目标。 */
export function useQuickGuideSteps(isEdit: () => boolean, polling?: ReturnType<typeof createHomePolling>) {
  // 私有化不展示引导，也不创建状态订阅，避免隐藏后仍查询告警、空间等引导数据。
  if (isPrivateDeployment()) {
    return {
      available: false,
      steps: computed<GuideStep[]>(() => []),
      showGuide: computed(() => false),
      handleAction: (_step: GuideStep) => undefined,
    }
  }
  const { t } = useI18n()
  const menuStore = useMenuStore()
  const resolveMenu = (step: Pick<GuideStep, 'target'>) => step.target.menus.find(code => menuStore.getMenu(code))
  const edit = computed(isEdit)
  const modules = useDashboardModules(edit)
  const refreshTime = ref(60)
  const health = useHomeRuntime('DeviceAccess', edit, refreshTime, undefined, polling)
  const algorithms = useHomeRuntime('AiCenter', edit, refreshTime, undefined, polling)
  const configuration = useHomeRuntime('QuickGuide', edit, refreshTime, undefined, polling)
  const applications = useHomeRuntime('Applications', edit, refreshTime, undefined, polling)

  const statuses = computed(() => resolveGuideStatuses(
    { rows: health.rows.value, loading: health.loading.value },
    { rows: algorithms.rows.value, loading: algorithms.loading.value },
    { rows: configuration.rows.value, loading: configuration.loading.value },
    { rows: applications.rows.value, loading: applications.loading.value, error: applications.error.value },
    isEdit(),
  ))
  const steps = computed<GuideStep[]>(() => {
    // 翻译键保持原有业务含义，编号由当前展示顺序生成。
    const definitions: Omit<GuideStep, 'status' | 'statusText' | 'disabled'>[] = [
      {
        key: 'space',
        title: t('packages.ProjectHome.QuickGuide_step3'),
        description: t('packages.ProjectHome.QuickGuide_step3_desc'),
        actionText: t('packages.ProjectHome.QuickGuide_step3_action'),
        target: { ...HOME_TARGETS.space, query: { action: 'create' } },
      },
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
        key: 'algorithm',
        title: t('packages.ProjectHome.QuickGuide_step4'),
        description: t('packages.ProjectHome.QuickGuide_step4_desc'),
        actionText: t('packages.ProjectHome.QuickGuide_step4_action'),
        target: HOME_TARGETS.algorithm,
      },
      {
        key: 'alarm',
        title: t('packages.ProjectHome.QuickGuide_step5'),
        description: t('packages.ProjectHome.QuickGuide_step5_desc'),
        actionText: t('packages.ProjectHome.QuickGuide_step5_action'),
        target: HOME_TARGETS.visionAlarm,
      },
      {
        key: 'application',
        title: t('packages.ProjectHome.QuickGuide_step6'),
        description: t('packages.ProjectHome.QuickGuide_step6_desc'),
        actionText: t('packages.ProjectHome.QuickGuide_step6_action'),
        target: HOME_TARGETS.applications,
      },
    ]
    return definitions.filter(step => guideStepAvailable(step.key, modules.value)).map(step => {
      const status = statuses.value[step.key]
      return { ...step, status, statusText: t(`packages.ProjectHome.QuickGuide_status_${status}`), disabled: !isEdit() && !resolveMenu(step) }
    })
  })

  // 只根据仍展示的步骤判断，已隐藏能力的 unknown 不能让引导永久停留。
  const showGuide = computed(() => shouldShowGuide(Object.fromEntries(
    steps.value.map(step => [step.key, step.status]),
  )))

  function handleAction(step: GuideStep) {
    // 已完成步骤仍允许进入管理页；预览和缺少菜单权限时不触发跳转。
    const current = steps.value.find(item => item.key === step.key)
    if (isEdit() || !current || current.disabled) return
    const menu = resolveMenu(current)
    if (menu) menuStore.jumpPage(menu, { params: current.target.params, query: current.target.query })
  }

  return { available: true, steps, showGuide, handleAction }
}
