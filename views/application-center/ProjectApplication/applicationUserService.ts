import {
  createBusinessApplicationUser,
  queryBusinessApplicationUsers,
  queryConsoleProjectMembers,
  queryUserDetails,
  updateBusinessApplicationUser,
  type ProjectMemberInfo,
  type UserDetailEntity,
} from '@authentication-manager-ui/api/application-center/businessApplication'
import { listOf, normalizeProjectMember } from './applicationModel'
import type { ApplicationUser, ApplicationUserDraft } from './types'

/**
 * The dimension query only returns membership rows plus basic user fields. Hydrate them
 * in one generic detail query so updates can preserve roles, organizations and positions.
 */
export const loadBusinessApplicationUsers = async (applicationId: string) => {
  const memberResponse = await queryBusinessApplicationUsers(applicationId)
  const members = listOf<UserDetailEntity>(memberResponse)
  const memberIds = members.map(entity => entity.id).filter(Boolean)
  if (!memberIds.length) return members

  const detailResponse = await queryUserDetails({
    pageIndex: 0,
    pageSize: memberIds.length,
    terms: [{ column: 'id', termType: 'in', value: memberIds }],
  })
  const detailById = new Map(listOf<UserDetailEntity>(detailResponse)
    .map(entity => [entity.id, entity] as const))
  return members.map(member => ({ ...member, ...detailById.get(member.id) }))
}

export const loadBindableProjectUsers = async (
  projectId: string,
  boundUsers: ApplicationUser[],
) => {
  if (!projectId) return []
  const response = await queryConsoleProjectMembers(projectId, {
    pageIndex: 0,
    pageSize: 1000,
    sorts: [{ name: 'createTime', order: 'desc' }],
  })
  const boundIds = new Set(boundUsers.map(user => user.id))
  return listOf<ProjectMemberInfo>(response)
    .map(normalizeProjectMember)
    .filter(user => user.id && !boundIds.has(user.id))
}

const hydrateUsers = async (
  userIds: string[],
) => {
  const response = await queryUserDetails({
    pageIndex: 0,
    pageSize: userIds.length,
    terms: [{ column: 'id', termType: 'in', value: userIds }],
  })
  const detailById = new Map(listOf<UserDetailEntity>(response).map(entity => [entity.id, entity] as const))
  const users = userIds.map(id => detailById.get(id)).filter((user): user is UserDetailEntity => !!user)
  if (users.length !== userIds.length) throw new Error('Selected users must be hydrated before binding')
  return users
}

export const bindBusinessApplicationUsers = async (
  applicationId: string,
  userIds: string[],
) => {
  const ids = [...new Set(userIds)].filter(Boolean)
  if (!ids.length) return
  const users = await hydrateUsers(ids)

  await Promise.all(users.map((user) => {
    // UserDetailService merges existing application dimensions before full-binding on update.
    return updateBusinessApplicationUser(user.id, {
      user: {
        ...user,
        id: user.id,
        name: user.name || user.username,
        username: user.username,
        telephone: user.telephone,
        email: user.email,
        status: user.status ?? 1,
      },
      roleIdList: (user.roleList || []).map(role => role.id).filter(Boolean),
      orgIdList: (user.orgList || []).map(org => org.id).filter(Boolean),
      positions: (user.positions || []).map(position => position.id).filter(Boolean),
      businessApplicationIdList: [applicationId],
    })
  }))
}

export const createUserForBusinessApplication = async (
  applicationId: string,
  draft: ApplicationUserDraft,
) => {
  // New users created from the application workspace must be bound to that application in the same create request.
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
}

export const updateBoundBusinessApplicationUser = async (
  userId: string,
  current: ApplicationUser,
  patch: Partial<ApplicationUser>,
  raw: UserDetailEntity | undefined,
  applicationRoleIds: ReadonlySet<string>,
) => {
  const next = { ...current, ...patch }
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
}
