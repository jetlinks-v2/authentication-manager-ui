import { reactive } from 'vue'
import {
  createBusinessApplication,
  deleteBusinessApplication,
  getBusinessApplication,
  getBusinessApplicationTemplateMenus,
  queryBusinessApplications,
  queryBusinessApplicationTemplates,
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
import {
  createUserForBusinessApplication,
  loadBusinessApplicationUsers,
  updateBoundBusinessApplicationUser,
} from './applicationUserService'
import {
  deleteBusinessApplicationRoleEntity,
  loadBusinessApplicationRoles,
  saveBusinessApplicationRole,
} from './applicationRoleService'
import type {
  ApplicationDetailState,
  ApplicationFilters,
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
const templateMenus = reactive<Record<string, string[]>>({})
const applicationEntities = new Map<string, BusinessApplicationEntity>()
const roleEntities = new Map<string, BusinessApplicationRoleEntity>()
const userEntities = new Map<string, UserDetailEntity>()
let applicationQuerySequence = 0

const replace = <T>(target: T[], values: T[]) => target.splice(0, target.length, ...values)

const ensureDetail = (applicationId: string) => {
  if (!details[applicationId]) details[applicationId] = { users: [], roles: [] }
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
    // Only the latest filter request may replace the shared ledger state.
    const sequence = ++applicationQuerySequence
    if (!projectId) {
      replace(applications, [])
      return applications
    }
    const response = await queryBusinessApplications({
      paging: false,
      terms: buildApplicationTerms(projectId, filters),
      sorts: [{ name: 'createTime', order: 'desc' }],
    })
    const nextApplications = rememberApplications(listOf<BusinessApplicationEntity>(response))
    if (sequence === applicationQuerySequence) replace(applications, nextApplications)
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
      configuration: {
        defaultLanguage: 'zh-CN',
        timezone: 'Asia/Shanghai',
        customDomain: '',
      },
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
        timezone: next.timezone,
        customDomain: next.domain,
      },
    })
    return loadApplication(id)
  }

  const removeApplication = async (id: string) => {
    await deleteBusinessApplication(id)
    const application = applications.find(item => item.id === id)
    const detail = details[id]
    detail?.roles.forEach(role => roleEntities.delete(role.id))
    detail?.users.forEach(user => userEntities.delete(`${id}:${user.id}`))
    applicationEntities.delete(id)
    delete details[id]

    const index = applications.findIndex(item => item.id === id)
    if (index >= 0) applications.splice(index, 1)
    return application
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

  const loadDetail = async (applicationId: string) => {
    ensureDetail(applicationId)
    await loadRoles(applicationId)
    // The detail workspace only exposes settings, members, and roles; defer unrelated asset queries.
    await loadUsers(applicationId)
    return details[applicationId]
  }

  const addUser = async (applicationId: string, draft: ApplicationUserDraft) => {
    await createUserForBusinessApplication(applicationId, draft)
    await loadUsers(applicationId)
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
    templateMenus,
    loadApplications,
    loadTemplates,
    loadTemplateMenus,
    loadApplication,
    createApplication,
    updateApplication,
    removeApplication,
    loadDetail,
    addUser,
    updateUser,
    saveRole,
    removeRole,
  }
}
