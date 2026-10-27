import { onBeforeUnmount, ref } from 'vue'
import { getUserList_api } from '@authentication-manager-ui/api/system/user'
import type { AnnouncementUserOption } from './types'

interface PlatformUser {
  id: string
  name?: string
  username?: string
}

interface UserQueryResponse {
  success?: boolean
  result?: PlatformUser[] | { data?: PlatformUser[] }
}

/** 管理发布弹窗的用户搜索、选中名称及请求竞态。 */
export const useAnnouncementAudience = () => {
  const userOptions = ref<AnnouncementUserOption[]>([])
  const selectedUserIds = ref<string[]>([])
  const userLoading = ref(false)
  let userSearchTimer: ReturnType<typeof setTimeout> | undefined
  let userRequestSequence = 0

  /** 将平台用户转换为公告选择器选项，提交值始终只保留用户 ID。 */
  function toUserOption(user: PlatformUser): AnnouncementUserOption {
    const primaryName = user.name || user.username || user.id
    const username = user.username && user.username !== primaryName
      ? `（${user.username}）`
      : ''
    return {
      label: `${primaryName}${username}`,
      value: user.id,
    }
  }

  /** 兼容平台分页与不分页查询结果，并丢弃缺少 ID 的异常记录。 */
  function extractUsers(response: UserQueryResponse): PlatformUser[] {
    if (!response.success) return []
    const result = response.result
    const users = Array.isArray(result) ? result : result?.data
    return (users || []).filter((user) => Boolean(user.id))
  }

  /** 仅保留已选用户与本次搜索结果，兼顾标签回显和搜索结果准确性。 */
  function replaceUserOptions(options: AnnouncementUserOption[]) {
    const previousOptionMap = new Map(userOptions.value.map((option) => [option.value, option]))
    const optionMap = new Map(options.map((option) => [option.value, option]))
    selectedUserIds.value.forEach((userId) => {
      const selectedOption = previousOptionMap.get(userId)
      if (selectedOption) optionMap.set(userId, selectedOption)
    })
    userOptions.value = [...optionMap.values()]
  }

  /** 加载发布候选项；搜索时保留已选用户名称，不因查询失败清空选择。 */
  async function loadUserOptions(keyword = '', selectedUserIds: string[] = []) {
    const requestSequence = ++userRequestSequence
    userLoading.value = true
    const normalizedKeyword = keyword.trim()
    const requests = [
      getUserList_api({
        paging: true,
        pageIndex: 0,
        pageSize: 50,
        includes: ['id', 'name', 'username'],
        filter: normalizedKeyword
          ? {
              name$like: `%${normalizedKeyword}%`,
              $or$username$like: `%${normalizedKeyword}%`,
            }
          : undefined,
      }),
    ]
    if (selectedUserIds.length) {
      requests.push(getUserList_api({
        paging: true,
        pageIndex: 0,
        pageSize: selectedUserIds.length,
        includes: ['id', 'name', 'username'],
        terms: [{ column: 'id', termType: 'in', value: selectedUserIds }],
      }))
    }

    try {
      const responses = await Promise.all(requests) as UserQueryResponse[]
      if (requestSequence !== userRequestSequence) return
      replaceUserOptions(responses.flatMap(extractUsers).map(toUserOption))
    } catch {
      if (requestSequence === userRequestSequence) {
        replaceUserOptions([])
      }
    } finally {
      if (requestSequence === userRequestSequence) {
        userLoading.value = false
      }
    }
  }

  /** 每次开始发布都重新加载候选项，不复用上次发布范围。 */
  function initializeUserOptions(initialUserIds: string[] = []) {
    if (userSearchTimer) clearTimeout(userSearchTimer)
    userSearchTimer = undefined
    userOptions.value = []
    selectedUserIds.value = [...initialUserIds]
    void loadUserOptions('', initialUserIds)
  }

  /** 用户输入停止 300ms 后再查询，减少高频搜索请求。 */
  function handleUserSearch(keyword: string) {
    if (userSearchTimer) clearTimeout(userSearchTimer)
    userSearchTimer = setTimeout(() => {
      userSearchTimer = undefined
      void loadUserOptions(keyword, selectedUserIds.value)
    }, 300)
  }

  /** 同步弹窗内当前选中用户，供后续搜索保留名称标签。 */
  function handleSelectedUsersChange(userIds: string[]) {
    selectedUserIds.value = [...userIds]
  }

  onBeforeUnmount(() => {
    if (userSearchTimer) clearTimeout(userSearchTimer)
    userRequestSequence += 1
  })
  return { userOptions, userLoading, initializeUserOptions, handleUserSearch, handleSelectedUsersChange }
}
