<template>
  <div class="role-list-wrap">
    <div class="role-list-wrap__select">
      <a-tree-select
        v-model:value="selectedRoleIds"
        :tree-default-expanded-keys="defaultExpandedKeys"
        :tree-data="selection.tree"
        tree-expand-action="click"
        :field-names="{ label: 'name', value: 'id', children: 'children' }"
        :placeholder="$t('components.EditUserDialog.939453-13')"
        :disabled="disabled"
        :filter-tree-node="(value, node) => filterSelectNode(value, node, 'name')"
        :height="233"
        :show-checked-strategy="TreeSelect.SHOW_ALL"
        multiple
        show-search
        @change="handleChange"
      >
        <template #title="record">
          <a-tooltip
            v-if="selection.extraRoleIds.has(record.id)"
            :title="$t('components.EditUserDialog.939453-34')"
          >
            <span class="j-ellipsis j-ellipsis-line-clamp role-list-wrap__disabled-name">{{ record.name }}</span>
          </a-tooltip>
          <j-ellipsis v-else>{{ record.name }}</j-ellipsis>
        </template>
        <template #tagRender="{ value, label, onClose }">
          <div class="ant-select-selection-item">
            <div class="ant-select-selection-item-content">{{ label }}</div>
            <div
              v-if="!disabled && !selection.extraRoleIds.has(value)"
              class="ant-select-selection-item-remove"
              @click.stop="onClose"
            >
              <AIcon type="CloseOutlined" />
            </div>
          </div>
        </template>
      </a-tree-select>
    </div>
    <j-permission-button
      v-if="!disabled"
      has-permission="system/Role:add"
      @click="openRoleCreate"
    >
      <template #icon><AIcon type="PlusOutlined" /></template>
    </j-permission-button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, type PropType } from 'vue'
import { TreeSelect } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import type { BusinessApplicationEntity } from '@authentication-manager-ui/api/application-center/businessApplication'
import { useTabSaveSuccess } from '@jetlinks-web-core/hooks'
import { filterSelectNode } from '@jetlinks-web-core/utils'
import { buildRoleSelectionTree } from '../roleSelectionTree'
import type { ApplicationRoleGroup, ApplicationRoleItem } from '../useApplicationRoleSelection'

const props = defineProps({
  value: {
    type: Array as PropType<string[]>,
    default: () => [],
  },
  roles: {
    type: Array as PropType<ApplicationRoleItem[]>,
    default: () => [],
  },
  roleGroups: {
    type: Array as PropType<ApplicationRoleGroup[]>,
    default: () => [],
  },
  applications: {
    type: Array as PropType<BusinessApplicationEntity[]>,
    default: () => [],
  },
  extraData: {
    type: Array as PropType<ApplicationRoleItem[]>,
    default: () => [],
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})
const emits = defineEmits<{
  (event: 'update:value', value: string[]): void
  (event: 'created'): void
}>()
const { t: $t } = useI18n()
const selectedRoleIds = ref<string[]>([])

const selection = computed(() => buildRoleSelectionTree(
  props.roles, props.roleGroups, props.applications, props.extraData,
  { global: $t('RoleLeft.index.507330-5'), applications: $t('ProjectApplication.role.title') },
))
const defaultExpandedKeys = computed(() => {
  const selectedIds = new Set(selectedRoleIds.value)
  return selection.value.tree.flatMap(root => root.children ? [root.id, ...root.children
    .filter(group => group.children?.some(role => selectedIds.has(role.id)))
    .map(group => group.id)] : [])
})

const handleChange = (value: string[]) => emits('update:value', value)

const { onOpen: openRoleCreate } = useTabSaveSuccess('system/Role', {
  onSuccess(roleId: string) {
    selectedRoleIds.value = [...selectedRoleIds.value, roleId]
    emits('update:value', selectedRoleIds.value)
    emits('created')
  },
})

watch(() => props.value, value => {
  selectedRoleIds.value = value || []
}, { immediate: true })

</script>

<style scoped>
.role-list-wrap {
  display: flex;
  width: 100%;
  gap: var(--space-2);
}

.role-list-wrap__select {
  flex: 1;
  min-width: 0;
}

.role-list-wrap :deep(.ant-select-selection-overflow-item) > span {
  width: 100%;
}

.role-list-wrap__disabled-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
