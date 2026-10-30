import type { HomeTarget } from '../shared/types'
import { HOME_TARGETS } from '../shared/navigation'

/** 复用 owning module 注册的入口，创建动作使用已经存在的编辑子路由。 */
export const SAAS_TARGETS: Record<string, HomeTarget> = {
  dashboard: { menus: ['resources/Dashboard'] },
  thirdParty: { menus: ['system/ThirdPartyLogin'] },
  createScene: { menus: ['iot-user/scene-linkage/Editor', 'rule-engine/Scene/Editor'] },
  camera: HOME_TARGETS.addVideo,
}

export const SAAS_QUICK_ACTIONS = [
  { id: 'video', icon: 'addVideo', labelKey: 'saasQuickCamera', descriptionKey: 'saasQuickCameraDesc', target: SAAS_TARGETS.camera },
  { id: 'scene', icon: 'scene', labelKey: 'saasQuickScene', descriptionKey: 'saasQuickSceneDesc', target: SAAS_TARGETS.createScene },
  { id: 'dashboard', icon: 'screen', labelKey: 'saasQuickDashboard', descriptionKey: 'saasQuickDashboardDesc', target: SAAS_TARGETS.dashboard },
  { id: 'thirdParty', icon: 'gateway', labelKey: 'saasQuickLogin', descriptionKey: 'saasQuickLoginDesc', target: SAAS_TARGETS.thirdParty },
]
