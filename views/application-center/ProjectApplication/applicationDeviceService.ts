import {
  queryDeviceDetails,
  queryDevices,
  type DeviceEntity,
  type PagerResult,
} from '@authentication-manager-ui/api/application-center/businessApplication'
import { listOf, normalizeDevice, resultOf } from './applicationModel'
import type { ResourcePickerPage, ResourcePickerQuery } from './types'

/**
 * Load devices already bound to one application.
 *
 * Bindable candidates are loaded lazily by the picker drawer so the detail page does
 * not issue two same-path device queries during initialization.
 */
export const loadBusinessApplicationDevices = async (applicationId: string) => {
  const boundTerm = {
    column: 'id',
    termType: 'dim-assets',
    value: { assetType: 'device', targets: [{ type: 'business_application', id: applicationId }] },
  }
  const boundResponse = await queryDevices({ paging: false, terms: [boundTerm] })

  return {
    bound: listOf<DeviceEntity>(boundResponse).map(item => normalizeDevice(item)),
    available: [],
  }
}

export const loadBusinessApplicationAvailableDevices = async (
  query: ResourcePickerQuery,
): Promise<ResourcePickerPage> => {
  const pageIndex = Number(query.pageIndex ?? 0)
  const pageSize = Number(query.pageSize ?? 10)
  const response = await queryDeviceDetails({
    pageIndex,
    pageSize,
    sorts: [{ name: 'createTime', order: 'desc' }],
    terms: query.terms || [],
    context: {
      includeTags: true,
      includeRelations: true,
      includeBind: false,
      includeFirmwareInfos: false,
      includeParent: true,
    },
  })
  const result = resultOf<PagerResult<DeviceEntity>>(response)

  return {
    data: (result.data || []).map(item => normalizeDevice(item)),
    total: Number(result.total ?? 0),
    pageIndex: Number(result.pageIndex ?? pageIndex),
    pageSize: Number(result.pageSize ?? pageSize),
  }
}
