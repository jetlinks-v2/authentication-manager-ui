<template>
  <div class="role-list-wrap">
    <div class="role-list-wrap__select">
      <a-tree-select
        v-model:value="selectedRoleIds"
        :tree-default-expanded-keys="selectedRoleIds || []"
        :tree-data="roleTree"
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
            v-if="applicationRoleIds.includes(record.id)"
            :title="$t('components.EditUserDialog.939453-38')"
          >
            <span class="j-ellipsis j-ellipsis-line-clamp role-list-wrap__disabled-name">{{ record.name }}</span>
          </a-tooltip>
          <a-tooltip
            v-else-if="extraRoleIds.includes(record.id)"
            :title="$t('components.EditUserDialog.939453-34')"
          >
            <span class="j-ellipsis j-ellipsis-line-clamp role-list-wrap__disabled-name">{{ record.name }}</span>
          </a-tooltip>
          <j-ellipsis v-else>{{ record.name }}</j-ellipsis>
        </template>
        <template #tagRender="{ value, label, onClose }">
          <div :class="{ 'ant-select-selection-item': true, 'tag-blue': isApplicationRole(value) }">
            <div class="ant-select-selection-item-content">{{ label }}</div>
            <div
              v-if="!isApplicationRole(value) && !extraRoleIds.includes(value)"
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
import type { PropType } from 'vue'
import { TreeSelect } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { useTabSaveSuccess } from '@jetlinks-web-core/hooks'
import { filterSelectNode } from '@jetlinks-web-core/utils'
import type { ApplicationRoleGroup, ApplicationRoleItem } from '../useApplicationRoleSelection'

interface RoleTreeNode extends ApplicationRoleItem {
  children?: RoleTreeNode[]
  disabled?: boolean
}

const props = defineProps({
  value: {
    type: Array as PropType<string[]>,
    default: () => [],
  },
  applicationRoleIds: {
    type: Array as PropType<string[]>,
    default: () => [],
  },
  roleGroups: {
    type: Array as PropType<ApplicationRoleGroup[]>,
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

const applicationRoleIdSet = computed(() => new Set(props.applicationRoleIds))
const isApplicationRole = (roleId: string) => applicationRoleIdSet.value.has(roleId)
const roleIdSet = computed(() => new Set(
  props.roleGroups.flatMap(group => (group.roles || []).map(role => role.id)),
))
const extraRoleIds = computed(() => props.extraData
  .filter(role => !roleIdSet.value.has(role.id))
  .map(role => role.id))

/**
 * 角色树保留当前用户无权限查看的已绑定角色，并只锁定应用角色，避免系统入口跨应用维护角色关系。
 */
const roleTree = computed<RoleTreeNode[]>(() => {
  const groups = props.roleGroups
  const groupNodes = groups.map(group => ({
    id: group.groupId,
    name: group.groupName,
    disabled: true,
    children: (group.roles || []).map(role => {
      return {
        ...role,
        disabled: isApplicationRole(role.id),
      }
    }),
  }))
  const extraNodes = props.extraData
    .filter(role => !roleIdSet.value.has(role.id))
    .map(role => ({ ...role, disabled: true }))
  return [...groupNodes, ...extraNodes]
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

.role-list-wrap .tag-blue {
  background: var(--info-bg);
  border-color: color-mix(in srgb, var(--accent) 30%, var(--bg));
  color: var(--accent);
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
