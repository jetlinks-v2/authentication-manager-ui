import {
  createBusinessApplicationUser,
  queryBusinessApplicationUsers,
  queryUserDetails,
  updateBusinessApplicationUser,
  type UserDetailEntity,
} from '@authentication-manager-ui/api/application-center/businessApplication'
import { listOf } from './applicationModel'
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
