import { reactive } from 'vue'
import {
  bindBusinessApplicationDevices,
  createBusinessApplication,
  deleteBusinessApplicationUser,
  getBusinessApplication,
  getBusinessApplicationTemplateMenus,
  queryBusinessApplications,
  queryBusinessApplicationTemplates,
  unbindBusinessApplicationDevice,
  updateBusinessApplication,
  type BusinessApplicationEntity,
  type BusinessApplicationRoleEntity,
  type BusinessApplicationTemplateEntity,
  type MenuView,
  type UserDetailEntity,
} from '@authentication-manager-ui/api/application-center/businessApplication'
import {
  buildApplicationTerms,
  flattenMenuNames,
  listOf,
  normalizeApplication,
  normalizeRole,
  normalizeTemplate,
  normalizeUser,
  resultOf,
} from './applicationModel'
import { loadBusinessApplicationCameras } from './applicationCameraService'
import { loadBusinessApplicationDevices } from './applicationDeviceService'
import {
  bindBusinessApplicationUsers,
  createUserForBusinessApplication,
  loadBindableProjectUsers,
  loadBusinessApplicationUsers,
  updateBoundBusinessApplicationUser,
} from './applicationUserService'
import {
  deleteBusinessApplicationRoleEntity,
  loadBusinessApplicationRoles,
  saveBusinessApplicationRole,
} from './applicationRoleService'
import type {
  ApplicationCameraResource,
  ApplicationDetailState,
  ApplicationFilters,
  ApplicationResource,
  ApplicationRoleDraft,
  ApplicationTemplate,
  ApplicationUser,
  ApplicationUserCandidate,
  ApplicationUserDraft,
  ProjectApplication,
  ProjectApplicationDraft,
} from './types'

const applications = reactive<ProjectApplication[]>([])
const templates = reactive<ApplicationTemplate[]>([])
const details = reactive<Record<string, ApplicationDetailState>>({})
const availableDevices = reactive<ApplicationResource[]>([])
const availableCameras = reactive<ApplicationCameraResource[]>([])
const bindableUsers = reactive<ApplicationUserCandidate[]>([])
const templateMenus = reactive<Record<string, string[]>>({})
const applicationEntities = new Map<string, BusinessApplicationEntity>()
const roleEntities = new Map<string, BusinessApplicationRoleEntity>()
const userEntities = new Map<string, UserDetailEntity>()

const replace = <T>(target: T[], values: T[]) => target.splice(0, target.length, ...values)

const ensureDetail = (applicationId: string) => {
  if (!details[applicationId]) details[applicationId] = { devices: [], cameras: [], users: [], roles: [] }
  return details[applicationId]
}

const projectIdOf = (applicationId: string) =>
  applications.find(item => item.id === applicationId)?.projectId
  || applicationEntities.get(applicationId)?.projectId
  || ''

const rememberApplications = (entities: BusinessApplicationEntity[]) => {
  entities.forEach(entity => applicationEntities.set(entity.id, entity))
  return entities.map(normalizeApplication)
}

const upsertApplication = (entity: BusinessApplicationEntity) => {
  applicationEntities.set(entity.id, entity)
  const application = normalizeApplication(entity)
  const index = applications.findIndex(item => item.id === application.id)
  if (index < 0) applications.unshift(application)
  else applications.splice(index, 1, application)
  return application
}

export const useProjectApplication = () => {
  const loadApplications = async (projectId: string, filters: ApplicationFilters) => {
    if (!projectId) {
      replace(applications, [])
      return applications
    }
    const response = await queryBusinessApplications({
      paging: false,
      terms: buildApplicationTerms(projectId, filters),
      sorts: [{ name: 'createTime', order: 'desc' }],
    })
    replace(applications, rememberApplications(listOf<BusinessApplicationEntity>(response)))
    return applications
  }

  const loadTemplates = async () => {
    const response = await queryBusinessApplicationTemplates({
      paging: false,
      sorts: [{ name: 'sortIndex', order: 'asc' }],
    })
    const values = listOf<BusinessApplicationTemplateEntity>(response)
      .map(normalizeTemplate)
      .sort((left, right) => left.sortIndex - right.sortIndex)
    replace(templates, values)
    return templates
  }

  const loadTemplateMenus = async (templateId: string) => {
    if (Object.prototype.hasOwnProperty.call(templateMenus, templateId)) return templateMenus[templateId]
    const response = await getBusinessApplicationTemplateMenus(templateId)
    const names = flattenMenuNames(listOf<MenuView>(response))
    templateMenus[templateId] = names
    return names
  }

  const loadApplication = async (id: string) => {
    const entity = resultOf<BusinessApplicationEntity>(await getBusinessApplication(id))
    return entity?.id ? upsertApplication(entity) : undefined
  }

  const createApplication = async (projectId: string, draft: ProjectApplicationDraft) => {
    const response = await createBusinessApplication({
      templateId: draft.templateId,
      name: draft.name,
      icon: draft.icon,
      description: draft.description,
      configuration: { defaultLanguage: 'zh-CN', customDomain: '' },
      state: 'enabled',
    })
    const result = resultOf<unknown>(response)
    if (typeof result === 'string') {
      const created = await loadApplication(result)
      if (created) return created
    }
    if (typeof result === 'object' && result !== null && 'id' in result) {
      return upsertApplication(result as BusinessApplicationEntity)
    }

    await loadApplications(projectId, { keyword: '' })
    const created = applications.find(item => item.name === draft.name && item.templateId === draft.templateId)
    if (!created) throw new Error('Created business application could not be loaded')
    return created
  }

  const updateApplication = async (id: string, patch: Partial<ProjectApplication>) => {
    const current = applications.find(item => item.id === id) || await loadApplication(id)
    if (!current) return undefined
    const raw = applicationEntities.get(id)
    const next = { ...current, ...patch }

    // projectId and templateId are immutable backend fields and must never re-enter update payloads.
    await updateBusinessApplication(id, {
      id,
      name: next.name,
      icon: next.icon,
      description: next.description,
      state: next.status,
      configuration: {
        ...raw?.configuration,
        defaultLanguage: next.defaultLanguage,
        customDomain: next.domain,
      },
    })
    return loadApplication(id)
  }

  const loadRoles = async (applicationId: string) => {
    const entities = await loadBusinessApplicationRoles(applicationId)
    entities.forEach(entity => roleEntities.set(entity.id, entity))
    const detail = ensureDetail(applicationId)
    replace(detail.roles, entities.map(normalizeRole))
    return detail.roles
  }

  const loadUsers = async (applicationId: string) => {
    const entities = await loadBusinessApplicationUsers(applicationId)
    const applicationRoleIds = new Set(ensureDetail(applicationId).roles.map(role => role.id))
    entities.forEach(entity => userEntities.set(`${applicationId}:${entity.id}`, entity))
    const detail = ensureDetail(applicationId)
    replace(detail.users, entities.map(entity => normalizeUser(entity, applicationRoleIds)))
    return detail.users
  }

  const loadBindableUsers = async (applicationId: string) => {
    const detail = ensureDetail(applicationId)
    const values = await loadBindableProjectUsers(projectIdOf(applicationId), detail.users)
    replace(bindableUsers, values)
    return bindableUsers
  }

  const loadDevices = async (applicationId: string) => {
    const result = await loadBusinessApplicationDevices(applicationId)
    const detail = ensureDetail(applicationId)
    replace(detail.devices, result.bound)
    replace(availableDevices, result.available)
    return detail.devices
  }

  const loadCameras = async (applicationId: string) => {
    const result = await loadBusinessApplicationCameras(applicationId)
    const detail = ensureDetail(applicationId)
    replace(detail.cameras, result.bound)
    replace(availableCameras, result.available)
    return detail.cameras
  }

  const loadDetail = async (applicationId: string) => {
    ensureDetail(applicationId)
    await loadRoles(applicationId)
    await Promise.all([loadUsers(applicationId), loadDevices(applicationId), loadCameras(applicationId)])
    await loadBindableUsers(applicationId)
    return details[applicationId]
  }

  const bindDevices = async (applicationId: string, ids: string[]) => {
    if (!ids.length) return
    await bindBusinessApplicationDevices(applicationId, ids)
    await loadDevices(applicationId)
  }

  const unbindDevice = async (applicationId: string, resourceId: string) => {
    await unbindBusinessApplicationDevice(applicationId, resourceId)
    await loadDevices(applicationId)
  }

  const bindCameras = async (applicationId: string, cameraIds: string[]) => {
    const selected = new Set(cameraIds)
    const deviceIds = [...new Set(availableCameras
      .filter(camera => selected.has(camera.id))
      .map(camera => camera.deviceId)
      .filter(Boolean))]
    if (!deviceIds.length) return
    await bindBusinessApplicationDevices(applicationId, deviceIds)
    await loadCameras(applicationId)
  }

  const unbindCamera = async (applicationId: string, camera: ApplicationCameraResource) => {
    if (!camera.deviceId) return
    await unbindBusinessApplicationDevice(applicationId, camera.deviceId)
    await loadCameras(applicationId)
  }

  const bindUsers = async (applicationId: string, userIds: string[]) => {
    await bindBusinessApplicationUsers(applicationId, userIds)
    await loadUsers(applicationId)
    await loadBindableUsers(applicationId)
  }

  const addUser = async (applicationId: string, draft: ApplicationUserDraft) => {
    await createUserForBusinessApplication(applicationId, draft)
    await loadUsers(applicationId)
    await loadBindableUsers(applicationId)
  }

  const updateUser = async (applicationId: string, userId: string, patch: Partial<ApplicationUser>) => {
    const current = ensureDetail(applicationId).users.find(item => item.id === userId)
    if (!current) return
    const applicationRoleIds = new Set(ensureDetail(applicationId).roles.map(role => role.id))
    await updateBoundBusinessApplicationUser(
      userId,
      current,
      patch,
      userEntities.get(`${applicationId}:${userId}`),
      applicationRoleIds,
    )
    await loadUsers(applicationId)
    await loadBindableUsers(applicationId)
  }

  const removeUser = async (applicationId: string, userId: string) => {
    await deleteBusinessApplicationUser(userId)
    await loadUsers(applicationId)
    await loadBindableUsers(applicationId)
  }

  const saveRole = async (applicationId: string, draft: ApplicationRoleDraft, roleId?: string) => {
    await saveBusinessApplicationRole(applicationId, draft, roleId, roleId ? roleEntities.get(roleId) : undefined)
    await loadRoles(applicationId)
  }

  const removeRole = async (applicationId: string, roleId: string) => {
    await deleteBusinessApplicationRoleEntity(roleId)
    await loadRoles(applicationId)
    await loadUsers(applicationId)
  }

  return {
    applications,
    templates,
    details,
    availableDevices,
    availableCameras,
    bindableUsers,
    templateMenus,
    loadApplications,
    loadTemplates,
    loadTemplateMenus,
    loadApplication,
    createApplication,
    updateApplication,
    loadDetail,
    bindDevices,
    unbindDevice,
    bindCameras,
    unbindCamera,
    addUser,
    bindUsers,
    updateUser,
    removeUser,
    saveRole,
    removeRole,
  }
}
