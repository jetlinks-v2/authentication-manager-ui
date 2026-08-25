import type { UserDetailEntity } from '@authentication-manager-ui/api/application-center/businessApplication'
import { normalizeRole, normalizeUser } from './applicationModel'
import { loadBusinessApplicationRoles } from './applicationRoleService'
import {
  bindProjectUsersToBusinessApplication,
  loadBusinessApplicationUser,
  loadProjectUserDetail,
  updateBoundBusinessApplicationUser,
} from './applicationUserService'
import type { ApplicationRole, ApplicationUser } from './types'

interface BoundUserState {
  changed: boolean
  bound: boolean
  raw?: UserDetailEntity
  user?: ApplicationUser
}

export type ApplicationAccessResult =
  | { type: 'ready'; changed: boolean }
  | { type: 'select-role'; changed: boolean; roles: ApplicationRole[]; selection: ApplicationRoleSelection }
  | { type: 'missing-role'; changed: boolean }
  | { type: 'missing-user'; changed: boolean }

export interface ApplicationRoleSelection {
  bound: boolean
  raw: UserDetailEntity
  roles: ApplicationRole[]
  user: ApplicationUser
}

const applicationRoleIdsOf = (roles: ApplicationRole[]) => new Set(roles.map(role => role.id))

const hasApplicationRole = (user: ApplicationUser, roleIds: ReadonlySet<string>) =>
  user.roleIds.some(roleId => roleIds.has(roleId))

const toUserState = (
  raw: UserDetailEntity | undefined,
  applicationRoleIds: ReadonlySet<string>,
  bound: boolean,
  changed: boolean,
): BoundUserState => ({
  changed,
  bound,
  raw,
  user: raw ? normalizeUser(raw, applicationRoleIds) : undefined,
})

const loadCurrentUserState = async (
  applicationId: string,
  userId: string,
  applicationRoleIds: ReadonlySet<string>,
): Promise<BoundUserState> => {
  const currentMember = await loadBusinessApplicationUser(applicationId, userId)
  if (currentMember?.id) return toUserState(currentMember, applicationRoleIds, true, false)

  return toUserState(await loadProjectUserDetail(userId), applicationRoleIds, false, false)
}

const bindCurrentUser = async (
  applicationId: string,
  userId: string,
  applicationRoleIds: ReadonlySet<string>,
  fallbackRaw?: UserDetailEntity,
): Promise<BoundUserState> => {
  await bindProjectUsersToBusinessApplication(applicationId, [userId])
  const boundMember = await loadBusinessApplicationUser(applicationId, userId)
    || fallbackRaw
    || await loadProjectUserDetail(userId)

  return toUserState(boundMember, applicationRoleIds, true, true)
}

export const ensureBusinessApplicationMembership = async (
  applicationId: string,
  userId: string,
  roles: ApplicationRole[] = [],
) => {
  const applicationRoleIds = applicationRoleIdsOf(roles)
  const currentUser = await loadCurrentUserState(applicationId, userId, applicationRoleIds)
  if (currentUser.bound) return false
  return (await bindCurrentUser(applicationId, userId, applicationRoleIds, currentUser.raw)).changed
}

export const ensureBusinessApplicationOpenAccess = async (
  applicationId: string,
  userId: string,
  selectedRoleId?: string,
): Promise<ApplicationAccessResult> => {
  const roles = (await loadBusinessApplicationRoles(applicationId)).map(normalizeRole)
  const applicationRoleIds = applicationRoleIdsOf(roles)
  const currentUser = await loadCurrentUserState(applicationId, userId, applicationRoleIds)

  if (!currentUser.user || !currentUser.raw) {
    return { type: 'missing-user', changed: currentUser.changed }
  }
  if (hasApplicationRole(currentUser.user, applicationRoleIds)) {
    if (currentUser.bound) return { type: 'ready', changed: false }
    return {
      type: 'ready',
      changed: (await bindCurrentUser(
        applicationId,
        userId,
        applicationRoleIds,
        currentUser.raw,
      )).changed,
    }
  }
  if (!roles.length) {
    return { type: 'missing-role', changed: currentUser.changed }
  }

  const role = selectedRoleId
    ? roles.find(item => item.id === selectedRoleId)
    : roles.length === 1
      ? roles[0]
      : undefined
  if (!role) {
    return {
      type: 'select-role',
      changed: false,
      roles,
      selection: {
        bound: currentUser.bound,
        raw: currentUser.raw,
        roles,
        user: currentUser.user,
      },
    }
  }

  const boundUser = currentUser.bound
    ? currentUser
    : await bindCurrentUser(applicationId, userId, applicationRoleIds, currentUser.raw)
  if (!boundUser.user || !boundUser.raw) {
    return { type: 'missing-user', changed: boundUser.changed }
  }

  // 打开应用前必须拥有应用内角色；绑定角色时保留用户原有的全局角色和组织职位。
  await updateBoundBusinessApplicationUser(
    userId,
    boundUser.user,
    { roleId: role.id },
    boundUser.raw,
    applicationRoleIds,
  )

  return { type: 'ready', changed: true }
}

export const bindSelectedBusinessApplicationRole = async (
  applicationId: string,
  userId: string,
  roleId: string,
  selection: ApplicationRoleSelection,
) => {
  const applicationRoleIds = applicationRoleIdsOf(selection.roles)
  if (!selection.bound) {
    await bindProjectUsersToBusinessApplication(applicationId, [userId])
  }

  // 角色选择确认后沿用首次准入检查的用户快照，避免绑定成功到跳转之间再查详情。
  await updateBoundBusinessApplicationUser(
    userId,
    selection.user,
    { roleId },
    selection.raw,
    applicationRoleIds,
  )
}
