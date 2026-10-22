<template>
  <div>
    <a-form
      ref="formRef"
      :model="formModel"
      layout="vertical"
      class="basic-form permission-form"
    >
      <a-form-item v-if="isNoCommunity" name="accessSupport" required>
        <template #label>
          <span style="margin-right: 0.1875rem">{{ $t('BasicInfo.Permission.040830-0') }}</span>
          <a-tooltip :title="$t('BasicInfo.Permission.040830-1')">
            <AIcon
              type="QuestionCircleOutlined"
              class="img-style"
              style="color: #a6a6a6"
            />
          </a-tooltip>
        </template>
        <a-radio-group
          v-model:value="formModel.accessSupport"
          name="radioGroup"
          @change='onChange'
        >
          <a-radio value="unsupported">{{ $t('BasicInfo.Permission.040830-2') }}</a-radio>
          <a-radio value="support">{{ $t('BasicInfo.Permission.040830-3') }}</a-radio>
          <a-radio value="indirect">
            <span style="margin-right: 0.1875rem">{{ $t('BasicInfo.Permission.040830-4') }}</span>
            <a-tooltip :title="$t('BasicInfo.Permission.040830-5')">
              <AIcon type="QuestionCircleFilled" class="img-style" />
            </a-tooltip>
          </a-radio>
        </a-radio-group>

        <a-form-item
          name="assetTypes"
          v-if="formModel.accessSupport === 'support'"
          :rules="[{ type: 'array', required: true, min: 1, message: $t('BasicInfo.Permission.040830-6') }]"
          style="margin-top: 1.5rem; margin-bottom: 0"
        >
          <a-select
            v-model:value="formModel.assetTypes"
            mode="multiple"
            style="width: 31.25rem"
            :placeholder="$t('BasicInfo.Permission.040830-6')"
            show-search
            option-filter-prop="label"
            :options="assetsType"
          >
          </a-select>
        </a-form-item>

        <a-form-item
          name="indirectMenus"
          v-if="formModel.accessSupport === 'indirect'"
          :rules="[{ required: true, message: $t('BasicInfo.Permission.040830-7') }]"
          style="margin-top: 1.5rem; margin-bottom: 0"
        >
          <a-tree-select
            v-model:value="formModel.indirectMenus"
            style="width: 25rem"
            :dropdown-style="{
              maxHeight: '25rem',
              overflow: 'auto',
            }"
            :placeholder="$t('BasicInfo.Permission.040830-7')"
            multiple
            show-search
            :tree-data="treeData"
            :field-names="{
              children: 'children',
              label: 'name',
              value: 'id',
            }"
          >
          </a-tree-select>
        </a-form-item>
      </a-form-item>
      <a-form-item :label="$t('BasicInfo.Permission.040830-8')" name="permissions">
        <PermissionChoose
          :first-width="3"
          max-height="21.875rem"
          v-model:value="formModel.permissions"
          :key="formModel.id || ''"
        />
      </a-form-item>
    </a-form>
  </div>
</template>

<script lang="ts" setup>
import type { PropType } from 'vue'
import type { FormInstance, TreeSelectProps } from 'ant-design-vue'
import PermissionChoose from '../../components/PermissionChoose.vue'
import { getAssetsType, getMenuTree } from '@authentication-manager-ui/api/system/menu'
import { isNoCommunity } from '@jetlinks-web-core/utils'
import { buildMenuPermissionPayload, createMenuPermissionForm } from './permissionForm'
import type { MenuPermissionSource } from './permissionForm'

const props = defineProps({
  value: {
    type: Object as PropType<MenuPermissionSource>,
    default: () => ({}),
  },
})

const formModel = reactive(createMenuPermissionForm())
const formRef = ref<FormInstance>()
const assetsType = ref<{ label: string; value: string }[]>([])
const treeData = ref<TreeSelectProps['treeData']>([])

watch(
  () => props.value,
  (value) => {
    // 每份输入都从完整初值重建，避免切换到缺少新字段的旧菜单时残留上一次选择。
    Object.assign(formModel, createMenuPermissionForm(value))
  },
  {
    deep: true,
    immediate: true,
  },
)

// 获取关联菜单
const queryMenuTree = () => {
  getMenuTree({ paging: false }).then((resp: { result: TreeSelectProps['treeData'] }) => {
    treeData.value = resp.result
  })
}

// 获取资产类型
const queryAssetsType = () => {
  getAssetsType().then((resp) => {
    assetsType.value = resp.result.map((item) => ({
      label: item.i18nName || item.name,
      value: item.id,
    }))
  })
}

// 模式间的资产和关联菜单互斥，切换时清空草稿，保存时再次按模式过滤。
const onChange = () => {
  formModel.assetTypes = []
  formModel.indirectMenus = []
}

onMounted(() => {
  queryMenuTree()
  if(isNoCommunity) {
    queryAssetsType()
  }
})

/** 校验多选字段后返回兼容载荷，不将旧详情整份复制回表单。 */
const onSave = async () => {
  await formRef.value!.validate()
  return buildMenuPermissionPayload(formModel)
}

defineExpose({ onSave })
</script>
