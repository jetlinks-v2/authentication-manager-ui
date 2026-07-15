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
import type { AssetTypeName } from '@jetlinks-web-core/hooks'
import { paramsEncodeQuery } from '@jetlinks-web-core/utils'
import { isNoCommunity } from '@jetlinks-web-core/utils/utils'
import { USER_CENTER_MENU_CODE } from '@jetlinks-web-core/utils/consts'
import { NotificationSubscriptionCode } from '@jetlinks-web-core/router/menu'
import {
  getPermissionDetail_api,
} from '@authentication-manager-ui/api/system/role'
import { getAssetsType } from '@authentication-manager-ui/api/system/menu'

const { t: $t } = useI18n()
const route = useRoute()
const loading = ref(false)
const initialized = ref(false)
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

const loadAssetTypes = async (): Promise<AssetTypeName[]> => {
  if (!isNoCommunity) return []
  try {
    const response = await getAssetsType()
    if (response?.success === false) throw new Error(response.message)
    return Array.isArray(response?.result) ? response.result : []
  } catch (error: any) {
    // 名称字典只增强展示，请求失败时保留授权能力并使用编辑器内置回退名称。
    onlyMessage(error?.message || $t('Permission.index.071527-3'), 'error')
    return []
  }
}

const load = async () => {
  const roleId = String(route.params.id || '')
  if (!roleId) return
  initialized.value = false
  loading.value = true
  try {
    const [response, assetTypes] = await Promise.all([
      getPermissionDetail_api(roleId, query),
      loadAssetTypes(),
    ])
    if (response?.success === false) throw new Error(response.message)
    const detail = response?.result || {}
    const menus = filterMenus(detail.menus || [])
    editor.reset({
      menus,
      assetAccesses: detail.assetAccesses,
      assetTypes,
    })
    initialized.value = true
  } catch (error: any) {
    onlyMessage(error?.message || $t('Permission.index.071527-3'), 'error')
  } finally {
    loading.value = false
  }
}

// 详情加载失败时禁止生成空快照，避免覆盖已有授权。
const onSave = () => initialized.value ? editor.getSnapshot() : undefined
onMounted(load)
defineExpose({ onSave, load })
</script>
