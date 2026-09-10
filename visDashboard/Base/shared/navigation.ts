import type { HomeFeature, HomeTarget } from './types'
/** 菜单编码来自各 owning module，运行时只解析当前项目已授予的菜单。 */
export const HOME_TARGETS: Record<string, HomeTarget> = {
  devices: { menus: ['iot-user-device-list', 'iot-user/device/list'] },
  video: { menus: ['video/resources', 'media/Device', 'video/live'] },
  addVideo: { menus: ['media/Device/Save', 'media/Device'] },
  gateway: { menus: ['iot-user/edge-gateway', 'edge/Device'] },
  createApplication: { menus: ['application-center/ProjectApplication/Create'] },
  applications: { menus: ['application-center/ProjectApplication'] },
  algorithm: { menus: ['algorithm-center'] },
  coverage: { menus: ['algorithm-center'] },
  members: { menus: [] },
  space: { menus: ['space/AreaManagement'] },
  alarmRules: { menus: ['alarm-rules'] },
  search: { menus: [] },
  notifications: { menus: ['notice/channel'] },
  messages: { menus: ['account/center'], params: { tabKey: 'StationMessage' } },
  usage: { menus: ['system/ProjectUsage', 'system/Operations/Quota'] },
  collector: { menus: [] },
  card: { menus: [] },
  screen: { menus: ['visualization/project'] },
  template: { menus: ['visualization/resource/template'] },
  image: { menus: ['visualization/resource/image'] },
  component: { menus: ['visualization/resource/component'] },
  model: { menus: ['visualization/resource/model'] },
  agent: { menus: ['agentDevelopment/applicationList'] },
  scene: { menus: ['iot-user/scene-linkage'] },
  visionAlarm: { menus: ['machine-vision/VisualAlarm'] },
  deviceAlarm: { menus: ['iot-user/device/alarm'] },
}
export const HOME_MORE_TARGETS: Partial<Record<HomeFeature, HomeTarget>> = {
  Applications: HOME_TARGETS.applications, Quotas: HOME_TARGETS.usage, Announcements: HOME_TARGETS.messages,
}
export const QUICK_ACTIONS = ['devices', 'video', 'gateway', 'createApplication', 'algorithm', 'space', 'alarmRules']
