import { reactive, readonly } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useProjectApplication } from './useProjectApplication'
import type { ProjectApplication } from './types'

const deletingApplicationIds = reactive(new Set<string>())

/** 列表与详情共用删除状态，避免对同一应用重复提交。 */
export const useApplicationDeletion = () => {
  const { t } = useI18n()
  const { removeApplication } = useProjectApplication()

  const deleteApplication = async ({ id, name }: Pick<ProjectApplication, 'id' | 'name'>) => {
    if (deletingApplicationIds.has(id)) return false

    deletingApplicationIds.add(id)
    try {
      await removeApplication(id)
      onlyMessage(t('ProjectApplication.detail.deleteSuccess', { name }))
      return true
    } catch {
      // 请求层已提示删除失败，保留应用供用户重试。
      return false
    } finally {
      deletingApplicationIds.delete(id)
    }
  }

  return { deletingApplicationIds: readonly(deletingApplicationIds), deleteApplication }
}
