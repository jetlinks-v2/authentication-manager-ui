import { reactive, watch, type ComputedRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import {
  bindBusinessApplicationDevices,
  unbindBusinessApplicationDevice,
} from '@authentication-manager-ui/api/application-center/businessApplication'
import {
  loadBusinessApplicationAvailableDevices,
  loadBusinessApplicationDevices,
} from '../applicationDeviceService'
import type { ApplicationResource } from '../types'

export const useApplicationDeviceBinding = (
  applicationId: ComputedRef<string>,
  active: ComputedRef<boolean>,
) => {
  const { t: $t } = useI18n()
  const data = reactive({
    bound: [] as ApplicationResource[],
    loadAvailable: loadBusinessApplicationAvailableDevices,
    loading: false,
    saving: false,
    loadFailed: false,
  })
  let loadVersion = 0

  const loadDevices = async (id: string) => {
    const version = ++loadVersion
    data.loading = true
    data.loadFailed = false
    try {
      const result = await loadBusinessApplicationDevices(id)
      if (version === loadVersion) data.bound = result.bound
    } catch {
      if (version === loadVersion) data.loadFailed = true
    } finally {
      if (version === loadVersion) data.loading = false
    }
  }

  // 只加载当前打开的设备页签，切换应用时清理上一应用的设备和在途结果。
  watch([applicationId, active], ([id, isActive], [previousId]) => {
    if (id !== previousId) {
      loadVersion += 1
      data.bound = []
      data.loading = false
      data.loadFailed = false
    }
    if (id && isActive) void loadDevices(id)
  }, { immediate: true })

  const updateDevices = async (
    action: (id: string) => Promise<unknown>,
    successMessage: string,
  ) => {
    if (data.saving) return
    const id = applicationId.value
    data.saving = true
    try {
      await action(id)
      onlyMessage(successMessage)
      if (id === applicationId.value && active.value) await loadDevices(id)
    } catch {
      // 请求层统一提示绑定或解绑失败，不更新本地绑定结果。
    } finally {
      data.saving = false
    }
  }

  const bindDevices = (ids: string[]) => updateDevices(
    id => bindBusinessApplicationDevices(id, ids),
    $t('ProjectApplication.resource.bindSuccess', { count: ids.length }),
  )

  const unbindDevice = (device: ApplicationResource) => updateDevices(
    id => unbindBusinessApplicationDevice(id, device.id),
    $t('ProjectApplication.resource.unbindSuccess', { name: device.name }),
  )

  return { data, bindDevices, unbindDevice }
}
