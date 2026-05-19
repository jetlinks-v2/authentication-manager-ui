<template>
  <div class="role-permiss-container">
    <div class="card">
      <div>
        <TitleComponent :data="$t('Permission.index.071527-0')" />
      </div>
      <PermissionTree ref="permissionTreeRef" />
      <div class="bottom">
        <a-button
            type="primary"
            :loading="loading"
            @click="clickSave"
            style="margin-top: 1.5rem"
        >{{ $t('Permission.index.071527-1') }}</a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" name="RolePermission">
import PermissionTree from '../components/PermissionTree.vue'
import { updatePermissionTree_api } from '@authentication-manager-ui/api/system/role'
import { onlyMessage } from '@jetlinks-web/utils'
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();
const route = useRoute()
const roleId = route.params.id as string
const loading = ref(false)
const permissionTreeRef = ref<any>()
const clickSave = () => {
  const resp = permissionTreeRef.value?.onSave();
  loading.value = true
  updatePermissionTree_api(roleId, {
    menus: resp,
  }).then((res:any)=>{
    if(res.success){
        onlyMessage($t('Permission.index.071527-2'))
    }
  }).finally(()=>{
    loading.value = false
  })
}
</script>

<style lang="less" scoped>
.role-permiss-container {
  .card {
    margin-bottom: 1.5rem;

    h5 {
      position: relative;
      display: flex;
      align-items: center;
      margin-bottom: 1.25rem;
      padding: 0.25rem 0 0.25rem 0.75rem;
      font-weight: bold;
      font-size: 1rem;

      &::before {
        position: absolute;
        top: 0.4375rem;
        left: 0;
        width: 0.25rem;
        height: calc(100% - 0.875rem);
        background-color: var(--jet-theme-primary, #1677FF);
        border-radius: 0.125rem;
        content: ' ';
      }
    }

    .basic-form {
      :deep(.ant-form-item-required) {
        padding-right: 0.75rem;

        &::before {
          right: 0;
        }
      }
      .ant-form-item {
        display: block;
        width: 60%;
      }
    }
  }
}
</style>
