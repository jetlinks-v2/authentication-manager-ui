import {
  queryBusinessApplicationUsers,
  queryUserDetails,
  type UserDetailEntity,
} from '@authentication-manager-ui/api/application-center/businessApplication'
import { listOf } from './applicationModel'

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
