import {
  queryDevicePermissions,
  queryMediaChannels,
  type AssetPermissionInfo,
  type MediaChannelEntity,
} from '@authentication-manager-ui/api/application-center/businessApplication'
import { listOf, normalizeCamera } from './applicationModel'

const unique = <T>(values: T[]) => [...new Set(values)]

const deviceAssetTerm = (applicationId: string) => ({
  column: 'deviceId',
  termType: 'dim-assets',
  value: { assetType: 'device', targets: [{ type: 'business_application', id: applicationId }] },
})

/**
 * Media channels inherit device asset permissions through `deviceId`, so binding a
 * camera is represented by binding its related IoT device to the application.
 */
export const loadBusinessApplicationCameras = async (applicationId: string) => {
  const [boundResponse, candidateResponse] = await Promise.all([
    queryMediaChannels({ paging: false, terms: [deviceAssetTerm(applicationId)] }),
    queryMediaChannels({ paging: false }),
  ])
  const bound = listOf<MediaChannelEntity>(boundResponse).map(normalizeCamera).filter(item => item.deviceId)
  const candidates = listOf<MediaChannelEntity>(candidateResponse).map(normalizeCamera).filter(item => item.deviceId)
  const deviceIds = unique(candidates.map(item => item.deviceId))
  const permissionResponse = deviceIds.length ? await queryDevicePermissions(deviceIds) : undefined
  const shareableDevices = new Set(listOf<AssetPermissionInfo>(permissionResponse)
    .filter(item => item.permissionInfoList?.some(permission => permission.id === 'share'))
    .map(item => item.assetId))

  return {
    bound,
    available: candidates.filter(item => shareableDevices.has(item.deviceId)),
  }
}
