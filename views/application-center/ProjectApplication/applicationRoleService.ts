import {
  createBusinessApplicationRole,
  deleteBusinessApplicationRole,
  queryBusinessApplicationRoles,
  updateBusinessApplicationRole,
  type BusinessApplicationRoleEntity,
} from '@authentication-manager-ui/api/application-center/businessApplication'
import { listOf } from './applicationModel'
import type { ApplicationRoleDraft } from './types'

export const loadBusinessApplicationRoles = async (applicationId: string) => {
  const response = await queryBusinessApplicationRoles(applicationId)
  return listOf<BusinessApplicationRoleEntity>(response)
}

export const saveBusinessApplicationRole = async (
  applicationId: string,
  draft: ApplicationRoleDraft,
  roleId?: string,
  raw?: BusinessApplicationRoleEntity,
) => {
  if (roleId) {
    const editableRole = { ...(raw || {}) }
    delete editableRole.applicationId
    await updateBusinessApplicationRole({
      ...editableRole,
      id: roleId,
      name: draft.name,
      description: draft.description,
    })
    return
  }

  await createBusinessApplicationRole(applicationId, {
    name: draft.name,
    description: draft.description,
    state: 'enabled',
  })
}

export const deleteBusinessApplicationRoleEntity = (roleId: string) =>
  deleteBusinessApplicationRole(roleId)
