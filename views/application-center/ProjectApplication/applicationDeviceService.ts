import {
  queryDevicePermissions,
  queryDevices,
  type AssetPermissionInfo,
  type DeviceEntity,
} from '@authentication-manager-ui/api/application-center/businessApplication'
import { listOf, normalizeDevice } from './applicationModel'

/**
 * Load bound devices and bindable candidates for one application.
 *
 * Candidates stay limited to assets for which the caller has `share`; the bind endpoint
 * performs the final target `save` and source-asset permission assertions.
 */
export const loadBusinessApplicationDevices = async (applicationId: string) => {
  const boundTerm = {
    column: 'id',
    termType: 'dim-assets',
    value: { assetType: 'device', targets: [{ type: 'business_application', id: applicationId }] },
  }
  const [boundResponse, candidateResponse] = await Promise.all([
    queryDevices({ paging: false, terms: [boundTerm] }),
    queryDevices({ paging: false }),
  ])
  const candidates = listOf<DeviceEntity>(candidateResponse)
  const permissionResponse = candidates.length
    ? await queryDevicePermissions(candidates.map(item => item.id))
    : undefined
  const shareable = new Set(listOf<AssetPermissionInfo>(permissionResponse)
    .filter(item => item.permissionInfoList?.some(permission => permission.id === 'share'))
    .map(item => item.assetId))

  return {
    bound: listOf<DeviceEntity>(boundResponse).map(normalizeDevice),
    available: candidates.filter(item => shareable.has(item.id)).map(normalizeDevice),
  }
}
