import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { useAuthStore } from '@jetlinks-web-core/store'
import { queryCallbackTasks, queryCallbackRecords, resyncApplicationCallback, requeueApplicationCallback, type CallbackDeliveryTask } from '@authentication-manager-ui/api/application-center/businessApplicationCallback'
import { resultOf } from '../applicationModel'
import { useApplicationCallbackPage } from './useApplicationCallbackPage'
import { callbackColumn, callbackSearchField, callbackStateField, type CallbackColumn } from './applicationCallbackDisplay'

interface CallbackOperationsOptions { id: () => string; active: () => boolean; available: () => boolean }
export const useApplicationCallbackOperations = (options: CallbackOperationsOptions) => {
  const { t } = useI18n()
  const auth = useAuthStore()
  const kind = ref<'tasks' | 'records'>('tasks')
  const tasks = useApplicationCallbackPage({ id: options.id, active: () => options.active() && kind.value === 'tasks', query: queryCallbackTasks, sort: 'createdAt' })
  const records = useApplicationCallbackPage({ id: options.id, active: () => options.active() && kind.value === 'records', query: queryCallbackRecords, sort: 'completedAt' })
  const page = computed(() => kind.value === 'tasks' ? tasks : records)
  const resyncing = ref(false)
  const requeueTaskId = ref('')
  const error = ref('')
  const canSave = computed(() => auth.hasPermission([
    'application-center/ProjectApplication:add', 'application-center/ProjectApplication:update', 'application-center/ProjectApplication:action',
  ]))
  const busy = computed(() => resyncing.value || !!requeueTaskId.value)
  let sequence = 0
  watch(() => [options.id(), options.active()] as const, () => {
    ++sequence; resyncing.value = false; requeueTaskId.value = ''; error.value = ''
  })
  onBeforeUnmount(() => { ++sequence })
  const current = (id: string, version: number) => options.id() === id && options.active() && sequence === version
  const refresh = () => Promise.all([tasks.load(true), records.load(true)])
  const resync = async () => {
    if (!canSave.value || !options.available() || busy.value) return
    const id = options.id()
    const version = sequence
    resyncing.value = true
    error.value = ''
    try {
      await resyncApplicationCallback(id)
      if (!current(id, version)) return
      onlyMessage(t('ApplicationConnection.resyncAccepted'))
      await refresh()
    } catch {
      if (current(id, version)) error.value = t('ApplicationConnection.operationFailed')
    } finally {
      if (current(id, version)) resyncing.value = false
    }
  }
  const requeue = async (task: CallbackDeliveryTask) => {
    if (!canSave.value || !options.available() || busy.value || task.state !== 'dead') return
    const id = options.id()
    const version = sequence
    requeueTaskId.value = task.id
    error.value = ''
    try {
      // 使用用户确认的当前行 attempt；false 后不重新读取并自动再投。
      const accepted = resultOf<boolean>(await requeueApplicationCallback(id, task.id, task.attempt))
      if (!current(id, version)) return
      onlyMessage(t(accepted ? 'ApplicationConnection.requeueAccepted' : 'ApplicationConnection.requeueChanged'), accepted ? 'success' : 'warning')
      if (accepted) await refresh()
    } catch {
      if (current(id, version)) error.value = t('ApplicationConnection.operationFailed')
    } finally {
      if (current(id, version)) requeueTaskId.value = ''
    }
  }
  const view = computed(() => {
    const isTask = kind.value === 'tasks'
    const keys = isTask ? ['state', 'id', 'eventId', 'attempt', 'createdAt', 'readyAt', 'completedAt', 'resultCode']
      : ['recordId', 'taskId', 'eventId', 'eventType', 'attempt', 'result', 'code', 'completedAt', 'nextRetryTime']
    const columns: CallbackColumn[] = keys.map(key => callbackColumn(key, t('ApplicationConnection.columns.' + key),
      ['createdAt', 'readyAt', 'completedAt', 'nextRetryTime'].includes(key)))
    if (isTask && canSave.value) columns.push({ key: 'actions', title: t('ApplicationConnection.columns.actions') })
    const fields = [callbackSearchField('eventId', t('ApplicationConnection.columns.eventId'))]
    if (isTask) {
      fields.push(callbackSearchField('id', t('ApplicationConnection.columns.id')))
      fields.push(callbackStateField('state', t('ApplicationConnection.columns.state'),
        ['pending', 'delivering', 'succeeded', 'dead', 'cancelled'], value => t('ApplicationConnection.state.' + value)))
    } else {
      fields.push(callbackSearchField('taskId', t('ApplicationConnection.columns.taskId')))
      fields.push(callbackSearchField('eventType', t('ApplicationConnection.columns.eventType')))
      fields.push(callbackSearchField('code', t('ApplicationConnection.columns.code')))
    }
    return { queryKey: options.id() + ':' + kind.value, rowKey: isTask ? 'id' : 'recordId',
      fields, columns, rows: page.value.rows.value, pagination: page.value.pagination.value }
  })
  return { kind, page, view, canSave, busy, error, resyncing, requeueTaskId, resync, requeue }
}
