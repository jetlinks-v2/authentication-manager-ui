import { computed, reactive } from 'vue'
import {
  bindBusinessApplicationDevices,
  createBusinessApplication,
  createBusinessApplicationRole,
  createBusinessApplicationUser,
  deleteBusinessApplicationRole,
  deleteBusinessApplicationUser,
  getBusinessApplication,
  getBusinessApplicationTemplateMenus,
  queryBusinessApplicationRoles,
  queryBusinessApplications,
  queryBusinessApplicationTemplates,
  unbindBusinessApplicationDevice,
  updateBusinessApplication,
  updateBusinessApplicationRole,
  updateBusinessApplicationUser,
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
import { loadBusinessApplicationDevices } from './applicationDeviceService'
import { loadBusinessApplicationUsers } from './applicationUserService'
import type {
  ApplicationDetailState,
  ApplicationFilters,
  ApplicationResource,
  ApplicationRoleDraft,
  ApplicationTemplate,
  ApplicationUser,
  ApplicationUserDraft,
  ProjectApplication,
  ProjectApplicationDraft,
} from './types'

const applications = reactive<ProjectApplication[]>([])
const templates = reactive<ApplicationTemplate[]>([])
const details = reactive<Record<string, ApplicationDetailState>>({})
const availableDevices = reactive<ApplicationResource[]>([])
const templateMenus = reactive<Record<string, string[]>>({})
const applicationEntities = new Map<string, BusinessApplicationEntity>()
const roleEntities = new Map<string, BusinessApplicationRoleEntity>()
const userEntities = new Map<string, UserDetailEntity>()

const replace = <T>(target: T[], values: T[]) => target.splice(0, target.length, ...values)

const ensureDetail = (applicationId: string) => {
  if (!details[applicationId]) details[applicationId] = { devices: [], users: [], roles: [] }
  return details[applicationId]
}

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
      projectId,
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
    const response = await queryBusinessApplicationRoles(applicationId)
    const entities = listOf<BusinessApplicationRoleEntity>(response)
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

  const loadDevices = async (applicationId: string) => {
    const result = await loadBusinessApplicationDevices(applicationId)
    const detail = ensureDetail(applicationId)
    replace(detail.devices, result.bound)
    replace(availableDevices, result.available)
    return detail.devices
  }

  const loadDetail = async (applicationId: string) => {
    ensureDetail(applicationId)
    await loadRoles(applicationId)
    await Promise.all([loadUsers(applicationId), loadDevices(applicationId)])
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

  const addUser = async (applicationId: string, draft: ApplicationUserDraft) => {
    await createBusinessApplicationUser({
      user: {
        name: draft.name,
        username: draft.username,
        password: draft.password,
        telephone: draft.phone,
        email: draft.email,
        status: 1,
      },
      roleIdList: [draft.roleId],
      businessApplicationIdList: [applicationId],
    })
    await loadUsers(applicationId)
  }

  const updateUser = async (applicationId: string, userId: string, patch: Partial<ApplicationUser>) => {
    const current = ensureDetail(applicationId).users.find(item => item.id === userId)
    if (!current) return
    const raw = userEntities.get(`${applicationId}:${userId}`)
    const next = { ...current, ...patch }
    const applicationRoleIds = new Set(ensureDetail(applicationId).roles.map(role => role.id))
    const roleIds = patch.roleId === undefined
      ? next.roleIds
      : [...next.roleIds.filter(id => !applicationRoleIds.has(id)), patch.roleId].filter(Boolean)

    // Omitting businessApplicationIdList preserves every existing application membership on update.
    await updateBusinessApplicationUser(userId, {
      user: {
        ...raw,
        id: userId,
        name: next.name,
        username: next.username,
        telephone: next.phone,
        email: next.email,
        status: next.enabled ? 1 : 0,
      },
      roleIdList: roleIds,
      orgIdList: next.orgIds,
      positions: next.positionIds,
    })
    await loadUsers(applicationId)
  }

  const removeUser = async (applicationId: string, userId: string) => {
    await deleteBusinessApplicationUser(userId)
    await loadUsers(applicationId)
  }

  const saveRole = async (applicationId: string, draft: ApplicationRoleDraft, roleId?: string) => {
    if (roleId) {
      const raw = roleEntities.get(roleId)
      await updateBusinessApplicationRole(roleId, { role: { ...raw, ...draft, id: roleId } })
    } else {
      await createBusinessApplicationRole({
        role: { ...draft, state: 'enabled' },
        businessApplicationIdList: [applicationId],
      })
    }
    await loadRoles(applicationId)
  }

  const removeRole = async (applicationId: string, roleId: string) => {
    await deleteBusinessApplicationRole(roleId)
    await loadRoles(applicationId)
    await loadUsers(applicationId)
  }

  return {
    applications,
    templates,
    details,
    availableDevices,
    templateMenus,
    getApplication: (id: string) => computed(() => applications.find(item => item.id === id)),
    getDetail: (id: string) => computed(() => details[id]),
    loadApplications,
    loadTemplates,
    loadTemplateMenus,
    loadApplication,
    createApplication,
    updateApplication,
    loadDetail,
    bindDevices,
    unbindDevice,
    addUser,
    updateUser,
    removeUser,
    saveRole,
    removeRole,
  }
}
