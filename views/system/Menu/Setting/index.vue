<template>
  <j-page-container>
    <ContentPanel class="menu-setting">
      <a-alert type="info" show-icon :message="$t('Setting.index.113436-0')" />
      <a-alert v-if="loadError" type="error" show-icon :message="$t('MenuSetting.loadFailed')">
        <template #action><a-button @click="load">{{ $t('MenuSetting.retry') }}</a-button></template>
      </a-alert>
      <a-alert v-if="failureMessage" type="error" show-icon :message="failureMessage" />
      <a-spin :spinning="busy">
        <a-tabs v-model:activeKey="activeOwner">
          <a-tab-pane v-for="owner in MENU_OWNERS" :key="owner" :tab="ownerLabel(owner)" :disabled="busy" />
        </a-tabs>
        <div class="menu-setting__tree">
          <j-scrollbar>
            <a-tree
              v-if="treeData.length"
              :key="activeOwner"
              defaultExpandAll
              multiple
              :draggable="canSave"
              :disabled="!canSave"
              :tree-data="treeData"
              :selectedKeys="selectedKeys"
              :fieldNames="{ key: 'id' }"
              @select="onSelect"
              @drop="onDrop"
            >
              <template #title="row">
                <span class="menu-setting__node">
                  <AIcon type="HolderOutlined" />
                  <span>{{ row.i18nName || row.name }}</span>
                </span>
              </template>
            </a-tree>
            <CloudEmpty v-else-if="!loading && !loadError" />
          </j-scrollbar>
        </div>
      </a-spin>
      <a-space>
        <a-button type="primary" :disabled="!canSave" :loading="saving" @click="visible = true">
          {{ $t('Setting.index.113436-2') }}
        </a-button>
        <j-permission-button
          :disabled="!canSave"
          :popConfirm="{
            title: $t('Setting.index.113436-3'),
            okText: $t('Setting.index.113436-4'),
            cancelText: $t('Setting.index.113436-5'),
            onConfirm: () => save(true),
          }"
        >{{ $t('Setting.index.113436-6') }}</j-permission-button>
      </a-space>
    </ContentPanel>
    <a-modal
      modalType="message"
      :open="visible"
      :confirmLoading="saving"
      @ok="save()"
      @cancel="visible = false"
    >
      {{ $t('MenuSetting.confirmSaveAll') }}
      <a-alert v-if="failureMessage" type="error" show-icon :message="failureMessage" />
    </a-modal>
  </j-page-container>
</template>

<script setup lang="ts" name="MenuSetting">
import { useI18n } from 'vue-i18n'
import { MENU_OWNERS } from './utils'
import { useMenuSetting } from './useMenuSetting'

const { t: $t } = useI18n()
const { activeOwner, treeData, selectedKeys, visible, loading, saving, loadError, failureMessage,
  busy, canSave, ownerLabel, load, onSelect, onDrop, save } = useMenuSetting()
</script>

<style scoped lang="less">
.menu-setting {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.menu-setting__tree {
  height: min(60vh, 34rem);
  min-height: 16rem;
}

.menu-setting__node {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}
</style>
