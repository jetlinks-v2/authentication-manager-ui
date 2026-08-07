import { computed, reactive } from 'vue'
import type {
  ApplicationDetailState,
  ApplicationFilters,
  ApplicationResource,
  ApplicationRole,
  ApplicationRoleDraft,
  ApplicationTemplate,
  ApplicationUser,
  ApplicationUserDraft,
  MenuPermissionNode,
  PermissionAction,
  ProjectApplication,
  ProjectApplicationDraft,
} from './types'

const templates: ApplicationTemplate[] = [
  { id: 'general', nameKey: 'ProjectApplication.template.general', descriptionKey: 'ProjectApplication.template.generalDesc', detailKey: 'ProjectApplication.template.generalDetail', icon: 'AppstoreOutlined' },
  { id: 'security', nameKey: 'ProjectApplication.template.security', descriptionKey: 'ProjectApplication.template.securityDesc', detailKey: 'ProjectApplication.template.securityDetail', icon: 'SafetyCertificateOutlined' },
  { id: 'commerce', nameKey: 'ProjectApplication.template.commerce', descriptionKey: 'ProjectApplication.template.commerceDesc', detailKey: 'ProjectApplication.template.commerceDetail', icon: 'ShopOutlined' },
  { id: 'elderly', nameKey: 'ProjectApplication.template.elderly', descriptionKey: 'ProjectApplication.template.elderlyDesc', detailKey: 'ProjectApplication.template.elderlyDetail', icon: 'MedicineBoxOutlined' },
  { id: 'construction', nameKey: 'ProjectApplication.template.construction', descriptionKey: 'ProjectApplication.template.constructionDesc', detailKey: 'ProjectApplication.template.constructionDetail', icon: 'ToolOutlined' },
  { id: 'device', nameKey: 'ProjectApplication.template.device', descriptionKey: 'ProjectApplication.template.deviceDesc', detailKey: 'ProjectApplication.template.deviceDetail', icon: 'CloudServerOutlined' },
  { id: 'custom', nameKey: 'ProjectApplication.template.custom', descriptionKey: 'ProjectApplication.template.customDesc', detailKey: 'ProjectApplication.template.customDetail', icon: 'BgColorsOutlined', disabled: true },
]

const permissionTree: MenuPermissionNode[] = [
  { key: 'overview', titleKey: 'ProjectApplication.permission.overview' },
  {
    key: 'visualization', titleKey: 'ProjectApplication.permission.visualization', children: [
      { key: 'visualization-workbench', titleKey: 'ProjectApplication.permission.visualizationWorkbench' },
      { key: 'dashboard', titleKey: 'ProjectApplication.permission.dashboard' },
      { key: 'data-asset', titleKey: 'ProjectApplication.permission.dataAsset' },
    ],
  },
  {
    key: 'iot', titleKey: 'ProjectApplication.permission.iot', children: [
      { key: 'gateway', titleKey: 'ProjectApplication.permission.gateway' },
      { key: 'device', titleKey: 'ProjectApplication.permission.device' },
      { key: 'device-health', titleKey: 'ProjectApplication.permission.deviceHealth' },
      { key: 'device-group', titleKey: 'ProjectApplication.permission.deviceGroup' },
    ],
  },
  {
    key: 'video', titleKey: 'ProjectApplication.permission.video', children: [
      { key: 'camera', titleKey: 'ProjectApplication.permission.camera' },
      { key: 'video-event', titleKey: 'ProjectApplication.permission.videoEvent' },
      { key: 'video-alarm', titleKey: 'ProjectApplication.permission.videoAlarm' },
      { key: 'image-search', titleKey: 'ProjectApplication.permission.imageSearch' },
      { key: 'passenger-flow', titleKey: 'ProjectApplication.permission.passengerFlow' },
      { key: 'heat-map', titleKey: 'ProjectApplication.permission.heatMap' },
    ],
  },
  {
    key: 'space', titleKey: 'ProjectApplication.permission.space', children: [
      { key: 'space-dashboard', titleKey: 'ProjectApplication.permission.spaceDashboard' },
      { key: 'space-management', titleKey: 'ProjectApplication.permission.spaceManagement' },
    ],
  },
  {
    key: 'alarm', titleKey: 'ProjectApplication.permission.alarm', children: [
      { key: 'alarm-rule', titleKey: 'ProjectApplication.permission.alarmRule' },
      { key: 'alarm-history', titleKey: 'ProjectApplication.permission.alarmHistory' },
    ],
  },
  {
    key: 'scene', titleKey: 'ProjectApplication.permission.scene', children: [
      { key: 'scene-linkage', titleKey: 'ProjectApplication.permission.sceneLinkage' },
      { key: 'rule-orchestration', titleKey: 'ProjectApplication.permission.ruleOrchestration' },
    ],
  },
  {
    key: 'application', titleKey: 'ProjectApplication.permission.application', children: [
      { key: 'project-application', titleKey: 'ProjectApplication.permission.projectApplication' },
      { key: 'open-api', titleKey: 'ProjectApplication.permission.openApi' },
    ],
  },
  {
    key: 'settings', titleKey: 'ProjectApplication.permission.settings', children: [
      { key: 'project-settings', titleKey: 'ProjectApplication.permission.projectSettings' },
      { key: 'role-management', titleKey: 'ProjectApplication.permission.roleManagement' },
    ],
  },
]

const allPermissionKeys = permissionTree.flatMap((item) => [item.key, ...(item.children?.map((child) => child.key) || [])])
const allActions: PermissionAction[] = ['view', 'edit', 'delete']

const createPermissions = (actions: PermissionAction[]) => Object.fromEntries(
  allPermissionKeys.map((key) => [key, [...actions]]),
)

const seedApplications: ProjectApplication[] = [
  {
    id: 'app-1', name: '园区安防助手', description: '面向园区安保人员的移动安防应用，覆盖告警处置与视频巡查',
    templateId: 'security', status: 'enabled', createdAt: '2026-06-12 10:24', defaultLanguage: 'zh-CN',
    domain: 'https://security.jetlinks.cn', allowDirectDevice: false,
  },
  {
    id: 'app-2', name: '商场运营看板', description: '商业综合体运营管理应用，包含客流、车流与工单处理',
    templateId: 'commerce', status: 'enabled', createdAt: '2026-06-28 16:48', defaultLanguage: 'zh-CN',
    domain: 'https://mall.jetlinks.cn', allowDirectDevice: true,
  },
  {
    id: 'app-3', name: '智慧养老守护', description: '养老机构看护应用，老人行为分析与护工协同',
    templateId: 'elderly', status: 'disabled', createdAt: '2026-07-05 09:12', defaultLanguage: 'zh-CN',
    domain: '', allowDirectDevice: false,
  },
]

const seedDevices: ApplicationResource[] = [
  { id: 'device-1', name: 'WIFI雷达传感器', serial: '2074432663984652288', category: 'WIFI雷达传感器', status: 'online', group: '研发楼', gateway: 'E栋网关1' },
  { id: 'device-2', name: '导轨温湿度', serial: '2074377763485499392', category: '导轨温湿度', status: 'online', group: '研发楼', gateway: 'E栋网关1' },
]

const availableDevices: ApplicationResource[] = [
  { id: 'device-3', name: '海湾主机-研发楼', serial: '2074432663984652289', category: '海湾主机', status: 'online', group: '研发楼', gateway: 'E栋网关1' },
  { id: 'device-4', name: '烟雾探测器A', serial: '2072990507820392450', category: '烟雾探测器', status: 'online', group: '研发楼', gateway: 'E栋网关1' },
  { id: 'device-5', name: '烟雾探测器B', serial: '2072990507820392451', category: '烟雾探测器', status: 'muted', group: '研发楼', gateway: 'E栋网关2' },
  { id: 'device-6', name: '电参数采集仪', serial: '2072990507820392455', category: '电参数采集仪', status: 'online', group: '配电室', gateway: 'A栋网关' },
  { id: 'device-7', name: '智能电表', serial: '2072990507820392457', category: '智能电表', status: 'online', group: '配电室', gateway: 'A栋网关' },
]

const seedCameras: ApplicationResource[] = [
  { id: 'camera-1', name: '东门摄像头', serial: 'CAM-E-001', category: '枪机', status: 'online', group: '公共区域', gateway: 'E栋网关1', area: '物联网产业园区 / 东门', supportsPtz: false },
  { id: 'camera-2', name: '大厅摄像头A', serial: 'CAM-E-002', category: '球机', status: 'online', group: '公共区域', gateway: 'E栋网关1', area: '物联网产业园区 / E栋 / 1F', supportsPtz: true },
  { id: 'camera-3', name: '运营办公室摄像头', serial: 'CAM-E-003', category: '枪机', status: 'online', group: '办公区域', gateway: 'E栋网关2', area: '物联网产业园区 / E栋 / 4F', supportsPtz: false },
]

const availableCameras: ApplicationResource[] = [
  { id: 'camera-4', name: '会议室摄像头', serial: 'CAM-E-004', category: '球机', status: 'online', group: '办公区域', gateway: 'E栋网关1', area: '物联网产业园区 / E栋 / 4F / 项目部办公区', supportsPtz: true },
  { id: 'camera-5', name: '车库摄像头', serial: 'CAM-E-005', category: '枪机', status: 'online', group: '公共区域', gateway: 'E栋网关1', area: '物联网产业园区 / E栋 / 2F / 公共区域', supportsPtz: false },
  { id: 'camera-6', name: '南门摄像头', serial: 'CAM-E-006', category: '枪机', status: 'online', group: '公共区域', gateway: 'E栋网关2', area: '物联网产业园区 / 南门', supportsPtz: false },
  { id: 'camera-7', name: '北门摄像头', serial: 'CAM-A-001', category: '枪机', status: 'online', group: '未分配区域', gateway: 'A栋网关', area: '未分配区域', supportsPtz: false },
]

const usageSeed = [
  { id: 'basic', nameKey: 'ProjectApplication.usage.basic', editionKey: 'ProjectApplication.edition.free', icon: 'UserOutlined', metrics: [
    { id: 'users', labelKey: 'ProjectApplication.usage.users', current: 7, limit: 10 },
    { id: 'roles', labelKey: 'ProjectApplication.usage.roles', current: 5, limit: 10 },
  ] },
  { id: 'development', nameKey: 'ProjectApplication.usage.development', editionKey: 'ProjectApplication.edition.basic', icon: 'CodeOutlined', metrics: [
    { id: 'entities', labelKey: 'ProjectApplication.usage.deviceEntities', current: 740, limit: 1200 },
    { id: 'messages', labelKey: 'ProjectApplication.usage.deviceMessages', current: 860000, limit: 1000000 },
    { id: 'frequency', labelKey: 'ProjectApplication.usage.frequency', current: 8, limit: 10 },
    { id: 'properties', labelKey: 'ProjectApplication.usage.properties', current: 42, limit: 50 },
  ] },
  { id: 'alarm', nameKey: 'ProjectApplication.usage.alarm', editionKey: 'ProjectApplication.edition.free', icon: 'AlertOutlined', metrics: [
    { id: 'alarm-config', labelKey: 'ProjectApplication.usage.alarmConfig', current: 120, limit: 200 },
  ] },
  { id: 'gateway', nameKey: 'ProjectApplication.usage.gateway', editionKey: 'ProjectApplication.edition.basic', icon: 'ApiOutlined', metrics: [], noteKey: 'ProjectApplication.usage.gatewayNote' },
  { id: 'iot', nameKey: 'ProjectApplication.usage.iot', editionKey: 'ProjectApplication.edition.enterprise', icon: 'CloudServerOutlined', metrics: [
    { id: 'iot-entities', labelKey: 'ProjectApplication.usage.deviceEntities', current: 1280, limit: 10000 },
    { id: 'iot-messages', labelKey: 'ProjectApplication.usage.deviceMessages', current: 860000, limit: 5000000 },
    { id: 'iot-frequency', labelKey: 'ProjectApplication.usage.frequency', current: 9, limit: 20 },
    { id: 'iot-properties', labelKey: 'ProjectApplication.usage.properties', current: 45, limit: 100 },
    { id: 'groups', labelKey: 'ProjectApplication.usage.groups', current: 18, limit: 550 },
  ] },
  { id: 'visualization', nameKey: 'ProjectApplication.usage.visualization', editionKey: 'ProjectApplication.edition.basic', icon: 'BarChartOutlined', metrics: [
    { id: 'pages', labelKey: 'ProjectApplication.usage.pages', current: 3, limit: 10 },
    { id: 'components', labelKey: 'ProjectApplication.usage.components', current: 42, limit: 100 },
  ] },
  { id: 'space', nameKey: 'ProjectApplication.usage.space', editionKey: 'ProjectApplication.edition.basic', icon: 'EnvironmentOutlined', metrics: [
    { id: 'spaces', labelKey: 'ProjectApplication.usage.spaces', current: 86, limit: 500 },
  ] },
  { id: 'inspection', nameKey: 'ProjectApplication.usage.inspection', editionKey: 'ProjectApplication.edition.free', icon: 'ScheduleOutlined', metrics: [
    { id: 'plans', labelKey: 'ProjectApplication.usage.plans', current: 2, limit: 5 },
    { id: 'routes', labelKey: 'ProjectApplication.usage.routes', current: 4, limit: 10 },
  ] },
  { id: 'vision', nameKey: 'ProjectApplication.usage.vision', editionKey: 'ProjectApplication.edition.basic', icon: 'VideoCameraOutlined', metrics: [
    { id: 'channels', labelKey: 'ProjectApplication.usage.channels', current: 12, limit: 32 },
    { id: 'storage', labelKey: 'ProjectApplication.usage.storage', current: 180, limit: 500, unit: 'GB' },
  ] },
]

const seedRoles: ApplicationRole[] = [
  { id: 'admin', name: '管理员', description: '可访问并管理项目内所有功能模块', builtIn: true, permissions: createPermissions(allActions) },
  { id: 'member', name: '普通成员', description: '可查看项目内所有功能，不可删除', builtIn: true, permissions: createPermissions(['view']) },
]

const seedUsers: ApplicationUser[] = [
  { id: 'user-1', name: '张伟', username: 'zhangwei', phone: '138****0001', roleId: 'admin', enabled: true },
  { id: 'user-2', name: '刘芳', username: 'liufang', phone: '139****0002', roleId: 'member', enabled: true },
  { id: 'user-3', name: '陈强', username: 'chenqiang', phone: '137****0003', roleId: 'member', enabled: false },
]

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const details = reactive<Record<string, ApplicationDetailState>>({})
const applications = reactive<ProjectApplication[]>(clone(seedApplications))

const createDetailState = (seeded = false): ApplicationDetailState => ({
  devices: seeded ? clone(seedDevices) : [],
  cameras: seeded ? clone(seedCameras) : [],
  users: seeded ? clone(seedUsers) : [],
  roles: clone(seedRoles),
  usage: clone(usageSeed),
})

seedApplications.forEach((application, index) => {
  details[application.id] = createDetailState(index === 0)
})

let sequence = 10
const createId = (prefix: string) => `${prefix}-${Date.now()}-${sequence++}`

/**
 * Frontend prototype data boundary. Replace these methods with request wrappers when the
 * project-application backend contract is available; consuming pages do not depend on storage details.
 */
export const useProjectApplication = () => {
  const queryApplications = (filters: ApplicationFilters) => computed(() => {
    const keyword = filters.keyword.trim().toLocaleLowerCase()
    return applications.filter((item) => {
      const keywordMatched = !keyword || `${item.name} ${item.description}`.toLocaleLowerCase().includes(keyword)
      return keywordMatched && (!filters.status || item.status === filters.status) && (!filters.templateId || item.templateId === filters.templateId)
    })
  })

  const getApplication = (id: string) => computed(() => applications.find((item) => item.id === id))
  const getDetail = (id: string) => computed(() => details[id])

  const createApplication = async (draft: ProjectApplicationDraft) => {
    const id = createId('app')
    const application: ProjectApplication = {
      ...draft,
      id,
      status: 'enabled',
      createdAt: new Date().toLocaleString('zh-CN', { hour12: false }).replaceAll('/', '-'),
      defaultLanguage: 'zh-CN',
      domain: '',
      allowDirectDevice: false,
    }
    applications.unshift(application)
    details[id] = createDetailState()
    return application
  }

  const updateApplication = async (id: string, patch: Partial<ProjectApplication>) => {
    const target = applications.find((item) => item.id === id)
    if (!target) return undefined
    Object.assign(target, patch)
    return target
  }

  const bindResources = async (applicationId: string, type: 'devices' | 'cameras', resourceIds: string[]) => {
    const detail = details[applicationId]
    if (!detail) return
    const source = type === 'devices' ? availableDevices : availableCameras
    const existingIds = new Set(detail[type].map((item) => item.id))
    detail[type].push(...clone(source.filter((item) => resourceIds.includes(item.id) && !existingIds.has(item.id))))
  }

  const unbindResource = async (applicationId: string, type: 'devices' | 'cameras', resourceId: string) => {
    const resources = details[applicationId]?.[type]
    if (!resources) return
    const index = resources.findIndex((item) => item.id === resourceId)
    if (index >= 0) resources.splice(index, 1)
  }

  const addUser = async (applicationId: string, draft: ApplicationUserDraft) => {
    details[applicationId]?.users.push({ ...draft, id: createId('user'), enabled: true })
  }

  const updateUser = async (applicationId: string, userId: string, patch: Partial<ApplicationUser>) => {
    const user = details[applicationId]?.users.find((item) => item.id === userId)
    if (user) Object.assign(user, patch)
  }

  const removeUser = async (applicationId: string, userId: string) => {
    const users = details[applicationId]?.users
    const index = users?.findIndex((item) => item.id === userId) ?? -1
    if (index >= 0) users?.splice(index, 1)
  }

  const saveRole = async (applicationId: string, draft: ApplicationRoleDraft, roleId?: string) => {
    const roles = details[applicationId]?.roles
    if (!roles) return
    const role = roles.find((item) => item.id === roleId)
    if (role) Object.assign(role, draft)
    else roles.push({ id: createId('role'), ...draft, builtIn: false, permissions: createPermissions(['view']) })
  }

  const updateRolePermissions = async (applicationId: string, roleId: string, permissions: Record<string, PermissionAction[]>) => {
    const role = details[applicationId]?.roles.find((item) => item.id === roleId)
    if (role) role.permissions = clone(permissions)
  }

  return {
    applications,
    templates,
    permissionTree,
    availableDevices,
    availableCameras,
    queryApplications,
    getApplication,
    getDetail,
    createApplication,
    updateApplication,
    bindResources,
    unbindResource,
    addUser,
    updateUser,
    removeUser,
    saveRole,
    updateRolePermissions,
  }
}
