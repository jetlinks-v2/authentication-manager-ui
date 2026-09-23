import {
  bindBusinessApplicationUsers,
  getCurrentUserBusinessApplications,
  getCurrentUserDetail,
  queryBusinessApplicationUsers,
  queryUserDetails,
  unbindBusinessApplicationUsers,
  updateBusinessApplicationUser,
  type PagerResult,
  type BusinessApplicationEntity,
  type UserDetailEntity,
} from '@authentication-manager-ui/api/application-center/businessApplication'
import { listOf, resultOf } from './applicationModel'
import type { ApplicationUser } from './types'

/**
 * 合并维度成员与当前可进入应用：后者是当前用户的访问事实，不能因用户资产范围缺失而丢失。
 * 最后通过通用详情查询补齐其他成员资料，当前用户始终使用个人详情接口补齐。
 */
export const loadBusinessApplicationUsers = async (applicationId: string) => {
  const [memberResponse, currentApplicationResponse] = await Promise.all([
    queryBusinessApplicationUsers(applicationId),
    getCurrentUserBusinessApplications(),
  ])
  const members = listOf<UserDetailEntity>(memberResponse)
  const currentApplications = listOf<BusinessApplicationEntity>(currentApplicationResponse)
  const hasCurrentApplication = currentApplications.some(application => application.id === applicationId)
  const currentUser = hasCurrentApplication
    ? resultOf<UserDetailEntity>(await getCurrentUserDetail())
    : undefined
  const membersWithCurrentUser = currentUser?.id
    && currentUser.username !== 'admin'
    && !members.some(member => member.id === currentUser.id)
    ? [currentUser, ...members]
    : members
  const memberIds = membersWithCurrentUser.map(entity => entity.id).filter(Boolean)
  if (!memberIds.length) return members

  const detailResponse = await queryUserDetails({
    pageIndex: 0,
    pageSize: memberIds.length,
    terms: [{ column: 'id', termType: 'in', value: memberIds }],
  })
  const detailById = new Map(listOf<UserDetailEntity>(detailResponse)
    .map(entity => [entity.id, entity] as const))
  return membersWithCurrentUser.map(member => ({
    ...member,
    ...detailById.get(member.id),
    ...(member.id === currentUser?.id ? currentUser : {}),
  }))
}

export const loadProjectUserDetail = async (userId: string) => {
  const detailResponse = await queryUserDetails({
    pageIndex: 0,
    pageSize: 1,
    terms: [{ column: 'id', termType: 'eq', value: userId }],
  })
  return listOf<UserDetailEntity>(detailResponse).find(entity => entity.id === userId)
}

export const loadBusinessApplicationUser = async (applicationId: string, userId: string) => {
  const [memberResponse, currentApplicationResponse] = await Promise.all([
    queryBusinessApplicationUsers(applicationId, {
      pageIndex: 0,
      pageSize: 1,
      terms: [{ column: 'id', termType: 'eq', value: userId }],
    }),
    getCurrentUserBusinessApplications(),
  ])
  const member = listOf<UserDetailEntity>(memberResponse).find(entity => entity.id === userId)
  const hasCurrentApplication = listOf<BusinessApplicationEntity>(currentApplicationResponse)
    .some(application => application.id === applicationId)
  const currentUser = hasCurrentApplication
    ? resultOf<UserDetailEntity>(await getCurrentUserDetail())
    : undefined
  const isCurrentUserMember = currentUser?.id === userId && currentUser.username !== 'admin'
  if (!member && !isCurrentUserMember) return undefined

  // The membership endpoint is the binding truth; generic detail keeps role/org/position updates lossless.
  const detail = await loadProjectUserDetail(userId)
  return {
    ...member,
    ...(detail || {}),
    ...(isCurrentUserMember ? currentUser : {}),
  }
}

export interface ProjectApplicationUserQuery {
  pageIndex?: number
  pageSize?: number
  terms?: Array<Record<string, unknown>>
  sorts?: Array<Record<string, unknown>>
}

/**
 * 加载可绑定用户；当前用户资料由身份接口补充，避免“自己创建的”用户范围遗漏本人。
 */
export const loadProjectApplicationUserCandidates = async (
  excludedUserIds: string[],
  query: ProjectApplicationUserQuery,
) => {
  const pageIndex = Number(query.pageIndex ?? 0)
  const pageSize = Number(query.pageSize ?? 10)
  const appendCurrentUser = pageIndex === 0 && !(query.terms?.length)
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
  const currentUser = appendCurrentUser
    ? resultOf<UserDetailEntity>(await getCurrentUserDetail())
    : undefined
  const shouldAppendCurrentUser = !!currentUser?.id
    && currentUser.username !== 'admin'
    && !excludedUserIds.includes(currentUser.id)
    && !users.some(user => user.id === currentUser.id)
  const candidates = shouldAppendCurrentUser ? [currentUser!, ...users] : users
  return {
    success: true,
    result: {
      data: candidates.map(user => ({
        ...user,
        name: user.name || user.username || user.id,
        username: user.username || user.id,
      })),
      total: Number(result?.total ?? 0) + (shouldAppendCurrentUser ? 1 : 0),
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
  // admin 角色不可修改；在请求边界拦截，覆盖列表及自动绑定入口。
  if ((current.username === 'admin' || raw?.username === 'admin')
    && (patch.roleId !== undefined || patch.roleIds !== undefined)) return

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
