<template>
  <div>
    <div class="grant-head">
      <p>{{ $t('ThirdPartyApplication.direct.grantHint') }}</p>
      <a-space wrap>
        <a-button v-if="canManageGroups" :disabled="saving" @click="openGroupManager">{{ $t('ThirdPartyApplication.direct.manageGroups') }}</a-button>
        <a-popconfirm :title="$t('ThirdPartyApplication.project.discardConfirm')" @confirm="load"><a-button :disabled="saving">{{ $t('ThirdPartyApplication.project.refresh') }}</a-button></a-popconfirm>
        <a-popconfirm :title="$t('ThirdPartyApplication.direct.revokeAllConfirm')" @confirm="save(true)">
          <a-button danger :disabled="!loaded || loading || saving || !original.length">{{ $t('ThirdPartyApplication.direct.revokeAll') }}</a-button>
        </a-popconfirm>
        <a-popconfirm :title="$t('ThirdPartyApplication.direct.replaceGrantsConfirm')" @confirm="save(false)">
          <a-button type="primary" :loading="saving" :disabled="!loaded || loading || !changed.length">{{ $t('ApiApplication.actions.save') }}</a-button>
        </a-popconfirm>
      </a-space>
    </div>
    <a-alert v-if="error" type="error" show-icon :message="error" class="grant-alert" />
    <a-alert v-if="hiddenGrants" type="warning" show-icon :message="$t('ThirdPartyApplication.direct.hiddenGrants')" class="grant-alert" />
    <a-spin :spinning="loading">
      <a-empty v-if="loaded && !groups.length" :description="$t('ThirdPartyApplication.direct.noGroups')">
        <a-button v-if="canManageGroups" @click="openGroupManager">{{ $t('ThirdPartyApplication.direct.manageGroups') }}</a-button>
      </a-empty>
      <a-collapse v-else>
        <a-collapse-panel v-for="group in groups" :key="group.id">
          <template #header><span>{{ group.name || group.id }}</span><a-tag class="scope-tag">{{ group.id }}</a-tag></template>
          <a-space class="group-actions">
            <a-button type="link" :disabled="saving || !operations(group).some(item => !item.disabled)" @click="selectAll(group)">{{ $t('ThirdPartyApplication.direct.selectAll') }}</a-button>
            <a-button type="link" :disabled="saving" @click="update(group.id, [])">{{ $t('ThirdPartyApplication.direct.clearGroup') }}</a-button>
          </a-space>
          <a-empty v-if="!operations(group).length" :description="$t('ThirdPartyApplication.direct.groupWithoutOperations')" />
          <a-alert v-else-if="operations(group).some(item => item.disabled)" type="warning" show-icon class="grant-alert"
            :message="$t('ThirdPartyApplication.direct.unavailableOperations')" />
          <a-checkbox-group :value="selected[group.id] || []" :disabled="saving" class="operation-list" @change="values => update(group.id, values as string[])">
            <a-checkbox v-for="operation in operations(group)" :key="operation.id" :value="operation.id" :disabled="operation.disabled">
              {{ operation.name || operation.id }}<small v-if="operation.description">{{ operation.description }}</small>
            </a-checkbox>
          </a-checkbox-group>
          <a-alert v-if="assetScoped(group)" :type="hasAssetScope(group.id) ? 'info' : 'warning'" show-icon class="grant-alert"
            :message="$t(hasAssetScope(group.id) ? 'ThirdPartyApplication.direct.assetScopePreserved' : 'ThirdPartyApplication.direct.assetScopeRequired')" />
        </a-collapse-panel>
      </a-collapse>
    </a-spin>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useDirectGrants } from './useDirectGrants'
const props = defineProps<{ applicationId: string }>()
const { t: $t } = useI18n()
const { groups, original, selected, changed, loading, saving, loaded, error, hiddenGrants,
  update, selectAll, operations, assetScoped, hasAssetScope, canManageGroups, openGroupManager, save, load } = useDirectGrants(() => props.applicationId)
</script>
<style scoped>
.grant-head { display: flex; gap: 16px; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; }
.grant-head p { color: var(--ink-4); flex: 1; min-width: 220px; }.grant-alert { margin: 12px 0; }.scope-tag { margin-left: 12px; }
.operation-list { display: flex; flex-direction: column; gap: 12px; }.operation-list small { display: block; color: var(--ink-4); }.group-actions { margin-bottom: 12px; }
</style>
