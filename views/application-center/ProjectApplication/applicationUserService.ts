import {
  bindBusinessApplicationUsers,
  queryBusinessApplicationUsers,
  queryUserDetails,
  unbindBusinessApplicationUsers,
  updateBusinessApplicationUser,
  type PagerResult,
  type UserDetailEntity,
} from '@authentication-manager-ui/api/application-center/businessApplication'
import { listOf, resultOf } from './applicationModel'
import type { ApplicationUser } from './types'

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

export interface ProjectApplicationUserQuery {
  pageIndex?: number
  pageSize?: number
  terms?: Array<Record<string, unknown>>
  sorts?: Array<Record<string, unknown>>
}

export const loadProjectApplicationUserCandidates = async (
  excludedUserIds: string[],
  query: ProjectApplicationUserQuery,
) => {
  const pageIndex = Number(query.pageIndex ?? 0)
  const pageSize = Number(query.pageSize ?? 10)
  const response = await queryUserDetails({
    ...query,
    pageIndex,
    pageSize,
    sorts: query.sorts || [{ name: 'createTime', order: 'desc' }],
    terms: [
      ...(query.terms || []),
      // Filter bound members before pagination so the picker never offers an existing application member.
      ...(excludedUserIds.length
        ? [{ column: 'id', termType: 'nin', value: [...excludedUserIds] }]
        : []),
    ],
  })
  const result = resultOf<PagerResult<UserDetailEntity>>(response)
  const users = result?.data || []
  return {
    success: true,
    result: {
      data: users.map(user => ({
        ...user,
        name: user.name || user.username || user.id,
        username: user.username || user.id,
      })),
      total: Number(result?.total ?? 0),
      pageIndex: Number(result?.pageIndex ?? pageIndex),
      pageSize: Number(result?.pageSize ?? pageSize),
    },
  }
}

export const bindProjectUsersToBusinessApplication = async (
  applicationId: string,
  userIds: string[],
) => {
  await bindBusinessApplicationUsers(applicationId, userIds)
}

export const unbindProjectUsersFromBusinessApplication = async (
  applicationId: string,
  userIds: string[],
) => {
  await unbindBusinessApplicationUsers(applicationId, userIds)
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
