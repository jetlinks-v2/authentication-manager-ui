import { computed, getCurrentInstance, onActivated, onDeactivated, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useUserStore } from '@jetlinks-web-core/store/user'
import { getApplicationRuntimeEntry, getProjectCodeFromLocation } from '@jetlinks-web-core/utils/project-runtime'
import { changeAnnouncementReadState } from '../../../views/system/Announcement/receivedDataSource'
import { getAnnouncementReadScope, subscribeAnnouncementReadChanges } from '../../../views/system/Announcement/localReadStore'
import { openAnnouncementDetail } from '../../../views/system/Announcement/realtimeNotification'
import { getHomeConfig } from '../shared/config'
import { useHomeRuntime } from '../shared/useHomeRuntime'
import type { HomeInfo, HomeRow } from '../shared/types'

interface HomeAnnouncementOptions {
  isEdit: () => boolean
  info: () => HomeInfo | undefined
}

/** 概览复用公告详情与本机批次确认；同页、跨标签页的确认都刷新列表及角标。 */
export function useHomeAnnouncements(options: HomeAnnouncementOptions) {
  const user = useUserStore()
  const route = useRoute()
  const router = useRouter()
  const { t } = useI18n()
  const appContext = getCurrentInstance()?.appContext
  const config = computed(() => getHomeConfig('Announcements', options.info()))
  const isSaas = computed(() => config.value.chart.displayStyle === 'saas')
  const canOpenAll = computed(() => !options.isEdit() && config.value.chart.navigation)
  const localRevision = ref(0)
  const active = ref(true)
  const refreshKey = computed(() => user.alarmUpdateCount + localRevision.value)
  const unread = useHomeRuntime('AnnouncementUnread', computed(options.isEdit),
    computed(() => config.value.refreshTime), refreshKey, undefined, isSaas)
  const unreadCount = computed(() => unread.error.value ? undefined : unread.rows.value[0]?.value)
  let scopeVersion = 0
  const scope = () => JSON.stringify([getAnnouncementReadScope(), getProjectCodeFromLocation(),
    route.params.projectId, route.query.projectId, getApplicationRuntimeEntry().applicationId])
  let stopReadChanges = () => {}
  watch([active, () => options.isEdit()], ([enabled, editing]) => {
    stopReadChanges()
    if (enabled && !editing) {
      stopReadChanges = subscribeAnnouncementReadChanges(() => { localRevision.value++ })
      localRevision.value++
    }
  }, { immediate: true })
  // 弹窗可能晚于概览生命周期关闭；离页或切换账号/项目后不得提交旧通知 ID。
  watch(scope, () => { scopeVersion++; localRevision.value++ }, { flush: 'sync' })
  onActivated(() => { active.value = true })
  onDeactivated(() => { scopeVersion++; active.value = false; stopReadChanges() })
  onUnmounted(() => { scopeVersion++; stopReadChanges() })

  /** 个人中心是基础路由，不依赖业务菜单；同步旧页签状态以兼容私有化个人中心。 */
  function openAll() {
    if (!canOpenAll.value) return
    user.tabKey = 'StationMessage'
    void router.push({ path: '/account/center', query: { tab: 'StationMessage' } })
  }

  /** 打开本条公告；仅确认成功后刷新，失败时保留弹窗及原有未读状态。 */
  function select(row: HomeRow) {
    if (!active.value || options.isEdit() || !config.value.chart.navigation || !row.notification || !row.id) return
    const openedScope = scopeVersion
    openAnnouncementDetail({
      payload: row.notification,
      appContext,
      markRead: async () => {
        if (!active.value || openedScope !== scopeVersion || options.isEdit() || !config.value.chart.navigation || row.readState === 'read') return
        try {
          const response = await changeAnnouncementReadState('_read', [row.id])
          if (response.status !== 200 || response.success === false) throw new Error('Announcement read update failed')
        } catch (error) {
          if (openedScope === scopeVersion) onlyMessage(t('Announcement.inbox.markReadFailed'), 'error')
          throw error
        }
      },
    })
  }

  return { isSaas, refreshKey, unreadCount, canOpenAll, openAll, select }
}
