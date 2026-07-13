<template>
  <a-spin :spinning="loading">
    <MenuAssetPermissionEditor
      :context="editor"
      :columns="columns"
      :show-asset-permissions="isNoCommunity"
      height="60vh"
    />
  </a-spin>
</template>

<script setup lang="ts" name="RolePermissionTree">
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { MenuAssetPermissionEditor } from '@jetlinks-web-core/components'
import { useMenuAssetPermissionEditor, useRegistryOptions } from '@jetlinks-web-core/hooks'
import { paramsEncodeQuery } from '@jetlinks-web-core/utils'
import { isNoCommunity } from '@jetlinks-web-core/utils/utils'
import { USER_CENTER_MENU_CODE } from '@jetlinks-web-core/utils/consts'
import { NotificationSubscriptionCode } from '@jetlinks-web-core/router/menu'
import {
  getGrantableAssetAccesses_api,
  getPermissionDetail_api,
} from '@authentication-manager-ui/api/system/role'

const { t: $t } = useI18n()
const route = useRoute()
const loading = ref(false)
const editor = useMenuAssetPermissionEditor({
  defaultSupportIds: ['creator'],
  protectedMenuCode: USER_CENTER_MENU_CODE,
  protectedButtonId: 'view',
})

const baseColumns = computed(() => [
  { title: $t('components.PermissionTree.954862-0'), dataIndex: 'menu', key: 'menu', width: '38%' },
  { title: $t('components.PermissionTree.954862-6'), dataIndex: 'action', key: 'action' },
])
const { mergedOptions: columns } = useRegistryOptions({ baseOptions: baseColumns, code: 'permission-tree-columns' })

const query = paramsEncodeQuery({
  terms: [{ value: '%show":false%', termType: 'nlike', column: 'options' }],
} as any)

const filterMenus = (menus: any[] = []): any[] => menus
  .filter(item => item.code !== NotificationSubscriptionCode)
  .map(item => ({ ...item, children: filterMenus(item.children || []) }))

const load = async () => {
  const roleId = String(route.params.id || '')
  if (!roleId) return
  loading.value = true
  try {
    const response = await getPermissionDetail_api(roleId, query)
    if (response?.success === false) throw new Error(response.message)
    const detail = response?.result || {}
    const menus = filterMenus(detail.menus || [])
    const grantableResponse = isNoCommunity
      ? await getGrantableAssetAccesses_api(menus)
      : undefined
    if (grantableResponse?.success === false) throw new Error(grantableResponse.message)
    editor.reset({
      menus,
      assetAccesses: detail.assetAccesses,
      grantableAssets: isNoCommunity ? (grantableResponse?.result || []) : undefined,
    })
  } catch (error: any) {
    onlyMessage(error?.message || $t('Permission.index.071527-3'), 'error')
  } finally {
    loading.value = false
  }
}

const onSave = () => editor.getSnapshot()
onMounted(load)
defineExpose({ onSave, load })
</script>
