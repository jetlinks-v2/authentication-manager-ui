import { updatePassword_api } from '@authentication-manager-ui/api/system/user'
import { clearVerifyCache } from '@jetlinks-web-core/package'
import { jumpLogin } from '@jetlinks-web-core/router'
import { beginLogoutRequest } from '@jetlinks-web-core/router/login-transition'
import { useUserStore } from '@jetlinks-web-core/store/user'

export function useUserPasswordReset() {
  const userStore = useUserStore()

  const resetPassword = async (params: Parameters<typeof updatePassword_api>[0]) => {
    if (!params.id) return { success: false, isSelf: false }
    const isSelf = params.id === userStore.userInfo.id
    // 本人密码重置可能使旧会话失效，在提交前登记以免并发 401 抢先回跳。
    const complete = isSelf ? beginLogoutRequest() : undefined
    let success = false
    try {
      const response = await updatePassword_api(params)
      success = response?.status === 200 && response.success !== false
      if (success && isSelf) {
        clearVerifyCache()
        jumpLogin({ reason: 'logout', destination: 'source-page' })
      }
      return { success, isSelf }
    } finally {
      complete?.(success)
    }
  }

  return { resetPassword }
}
