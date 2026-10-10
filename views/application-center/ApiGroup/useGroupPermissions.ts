import { computed } from 'vue'
import { useAuthStore } from '@jetlinks-web-core/store/auth'
export const groupMenu = 'application-center/ApiGroup'
export const useGroupPermissions = () => {
  const auth = useAuthStore()
  const has = (button: string) => auth.hasPermission(groupMenu + ':' + button)
  return { canQuery: computed(() => has('view')), canCreate: computed(() => has('add')),
    canUpdate: computed(() => has('update')), canChangeStatus: computed(() => has('action')),
    canDelete: computed(() => has('delete')), canSelectSpecs: computed(() => has('selectApi')) }
}
