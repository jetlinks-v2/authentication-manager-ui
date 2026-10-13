import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { queryCallbackMembers, queryCallbackRoles } from '@authentication-manager-ui/api/application-center/businessApplicationCallback'
import { useApplicationCallbackPage } from './useApplicationCallbackPage'
import { callbackColumn, callbackSearchField, callbackStateField } from './applicationCallbackDisplay'

export const useApplicationCallbackSnapshots = (id: () => string, active: () => boolean) => {
  const { t, te } = useI18n()
  const stateText = (state?: string) => !state ? '—' : te('ApplicationConnection.state.' + state) ? t('ApplicationConnection.state.' + state) : state
  const kind = ref<'members' | 'roles'>('members')
  const members = useApplicationCallbackPage({ id, active: () => active() && kind.value === 'members', query: queryCallbackMembers, sort: 'modifyTime' })
  const roles = useApplicationCallbackPage({ id, active: () => active() && kind.value === 'roles', query: queryCallbackRoles, sort: 'modifyTime' })
  const page = computed(() => kind.value === 'members' ? members : roles)
  const view = computed(() => {
    const isMember = kind.value === 'members'
    const keys = isMember ? ['id', 'username', 'name', 'status', 'email', 'telephone', 'modifyTime'] : ['id', 'name', 'description', 'state', 'modifyTime']
    const fields = [callbackSearchField('id', t('ApplicationConnection.columns.id')), callbackSearchField('name', t('ApplicationConnection.columns.name'))]
    if (isMember) fields.push(callbackSearchField('username', t('ApplicationConnection.columns.username')))
    fields.push(isMember
      ? callbackStateField('status', t('ApplicationConnection.columns.state'), ['enabled', 'disabled', 'locked'], stateText)
      : callbackSearchField('state', t('ApplicationConnection.columns.state')))
    return {
      queryKey: id() + ':' + kind.value, rowKey: 'id', fields,
      columns: keys.map(key => callbackColumn(key, t('ApplicationConnection.columns.' + key), key === 'modifyTime')),
      rows: page.value.rows.value, pagination: page.value.pagination.value,
    }
  })
  return { kind, page, view, stateText }
}
