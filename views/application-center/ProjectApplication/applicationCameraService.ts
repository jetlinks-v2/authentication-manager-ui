import {
  queryMediaDeviceChannels,
  queryMediaDevices,
  queryMediaChannels,
  type MediaChannelEntity,
  type MediaDeviceEntity,
  type PagerResult,
} from '@authentication-manager-ui/api/application-center/businessApplication'
import { enumText, enumValue, listOf, normalizeCamera, resultOf } from './applicationModel'
import type { ResourcePickerGateway, ResourcePickerPage, ResourcePickerQuery } from './types'

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
  const boundResponse = await queryMediaChannels({ paging: false, terms: [deviceAssetTerm(applicationId)] })
  const bound = listOf<MediaChannelEntity>(boundResponse).map(normalizeCamera).filter(item => item.deviceId)

  return {
    bound,
    available: [],
  }
}

export const loadBusinessApplicationCameraGateways = async (): Promise<ResourcePickerGateway[]> => {
  const pageSize = 200
  let pageIndex = 0
  const entities: MediaDeviceEntity[] = []

  while (true) {
    const response = await queryMediaDevices({
      pageIndex,
      pageSize,
      sorts: [{ name: 'createTime', order: 'desc' }],
    })
    const result = resultOf<PagerResult<MediaDeviceEntity>>(response)
    const rows = result.data || []
    entities.push(...rows)
    if (rows.length < pageSize || (result.total !== undefined && entities.length >= result.total)) break
    pageIndex += 1
  }

  return entities.map((item) => {
    const status = enumValue(item.state, 'offline')
    return {
      id: item.id,
      name: item.name || item.id,
      provider: item.provider || '',
      channelNumber: Number(item.channelNumber || 0),
      status,
      statusText: enumText(item.state, status),
    }
  }).filter(item => item.id)
}

export const loadBusinessApplicationAvailableCameras = async (
  gatewayId: string,
  query: ResourcePickerQuery,
): Promise<ResourcePickerPage> => {
  const pageIndex = Number(query.pageIndex ?? 0)
  const pageSize = Number(query.pageSize ?? 10)
  const response = await queryMediaDeviceChannels(gatewayId, {
    pageIndex,
    pageSize,
    terms: query.terms,
    sorts: [{ name: 'createTime', order: 'desc' }],
  })
  const result = resultOf<PagerResult<MediaChannelEntity>>(response)

  return {
    data: (result.data || []).map(normalizeCamera).filter(item => item.deviceId),
    total: Number(result.total ?? 0),
    pageIndex: Number(result.pageIndex ?? pageIndex),
    pageSize: Number(result.pageSize ?? pageSize),
  }
}
