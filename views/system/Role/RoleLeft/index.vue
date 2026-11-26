<template>
  <div class="left-contain">
    <header class="left-contain__header"><strong>{{ $t('RoleLeft.index.507330-8') }}</strong></header>
    <a-input v-model:value="searchValue" class="left-contain__search" allow-clear
      :placeholder="$t('Role.application.searchPlaceholder')" @change="expandSearchResults">
      <template #suffix><AIcon type="SearchOutlined" /></template>
    </a-input>
    <a-alert v-if="groupError || applicationError" type="error" show-icon
      :message="$t(groupError ? 'Role.application.groupLoadFailed' : 'Role.application.loadFailed')">
      <template #action>
        <a-button size="small" @click="groupError ? loadGroups() : loadApplications()">{{ $t('ProjectApplication.list.retry') }}</a-button>
      </template>
    </a-alert>
    <div class="listBox">
      <a-spin :spinning="groupLoading">
        <a-tree v-if="treeData.length" v-model:expandedKeys="expandedKeys" :selected-keys="selectedKeys"
          :tree-data="treeData" :field-names="{ title: 'name', key: 'key', children: 'children' }"
          :show-line="{ showLeafIcon: false }" block-node @select="onSelect">
          <template #title="node">
            <div v-if="node.group && editingId === node.group.id" class="editingItem" @click.stop>
              <AIcon class="treeItem__icon" type="icon-moren" />
              <a-input ref="inputRef" v-model:value="editName" :maxlength="64" :disabled="saving"
                @blur="saveGroup(node.group)" @press-enter="saveGroup(node.group)" @keydown.esc="cancelEdit" />
            </div>
            <div v-else class="treeItem" @click="node.kind === 'application-root' && toggleApplicationRoot()">
              <div class="itemText">
                <AIcon class="treeItem__icon" :type="node.kind === 'application' || node.kind === 'application-root'
                  ? 'AppstoreOutlined' : node.kind === 'global' ? 'icon-jiaose' : 'icon-moren'" />
                <j-ellipsis style="flex: 1; min-width: 0">{{ node.name }}</j-ellipsis>
                <a-spin v-if="node.kind === 'application-root' && applicationLoading" size="small" />
              </div>
              <div v-if="node.kind === 'group' && node.group.id !== 'default_group'" class="treeItem__actions" @click.stop>
                <j-permission-button type="link" danger size="small"
                  has-permission="system/Role:delete"
                  :tooltip="{ title: $t('RoleLeft.index.507330-3') }"
                  :pop-confirm="{ title: $t('RoleLeft.index.507330-2'), onConfirm: () => removeGroup(node.group) }">
                  <AIcon type="DeleteOutlined" />
                </j-permission-button>
                <j-permission-button type="link" size="small"
                  has-permission="system/Role:update"
                  :tooltip="{ title: $t('RoleLeft.index.507330-4') }"
                  @click="editGroup(node.group)"><AIcon type="EditOutlined" /></j-permission-button>
              </div>
            </div>
          </template>
        </a-tree>
        <CloudEmpty v-else />
      </a-spin>
    </div>
    <j-permission-button v-if="canCreateGroup" class="left-contain__create" block
      has-permission="system/Role:add"
      :disabled="Boolean(editingId) || groupLoading || groupError" @click="addGroup">
      <template #icon><AIcon type="PlusOutlined" /></template>{{ $t('RoleLeft.index.507330-1') }}
    </j-permission-button>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import type { RoleScope } from '../roleScope'
import { useRoleNavigation } from './useRoleNavigation'

defineOptions({ name: 'RoleLeft' })
const props = defineProps({ scope: { type: Object as PropType<RoleScope>, required: true } })
const emit = defineEmits<{ select: [scope: RoleScope] }>()
const { treeData, selectedKeys, expandedKeys, canCreateGroup, groupLoading, applicationLoading,
  groupError, applicationError, searchValue, editingId, editName, saving, inputRef,
  loadGroups, loadApplications, onSelect, toggleApplicationRoot, addGroup, editGroup, cancelEdit, saveGroup, removeGroup,
  expandSearchResults } = useRoleNavigation(props, scope => emit('select', scope))
</script>

<style lang="less" scoped>
.left-contain {
	height: 100%;
  display: flex;
  flex-direction: column;
	gap: var(--space-4);

	&__header {
		display: flex;
		flex: 0 0 auto;
		align-items: center;
		min-height: 0;

		strong {
			color: var(--jet-theme-text-title);
			font-size: var(--fs-18);
			font-weight: 600;
			line-height: var(--lh-24);
		}
	}

	&__search,
	&__create {
		flex: 0 0 auto;
	}
}

.treeItem {
	display: flex;
	justify-content: space-between;

	&__actions {
		display: none;
		flex-shrink: 0;
		align-items: center;
	}

	&:hover .treeItem__actions {
		display: flex;
	}

	.itemText {
		display: flex;
		flex: 1;
		min-width: 0;
		align-items: center;
		gap: var(--space-1);
		line-height: 2rem;
	}
}

.parentText,
.editingItem {
	display: flex;
	align-items: center;
	gap: var(--space-1);
}

.parentText {
	flex: 1;
	min-width: 0;
}

.treeItem__icon {
	flex: none;
	color: var(--text-color-secondary);
}

.listBox {
	flex: 1;
	min-height: 0;
	overflow: auto;
}
</style>
