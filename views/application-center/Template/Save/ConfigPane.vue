<template>
  <section class="template-permission">
    <header class="template-permission__toolbar">
      <h2>{{ $t('ApplicationTemplate.detail.permission') }}</h2>
      <a-space v-if="state.editing.value">
        <a-button :disabled="state.saving.value" @click="state.cancel">{{ $t('ApplicationTemplate.common.cancel') }}</a-button>
        <a-button type="primary" :loading="state.saving.value" :disabled="view.disabled.value" @click="state.save">
          <template #icon><AIcon type="SaveOutlined" /></template>
          {{ $t('ApplicationTemplate.permission.save') }}
        </a-button>
      </a-space>
      <a-button v-else-if="state.canUpdate.value" type="primary" :disabled="!state.initialized.value || state.loadingEditor.value" @click="state.edit">
        <template #icon><AIcon type="EditOutlined" /></template>
        {{ $t('ApplicationTemplate.permission.edit') }}
      </a-button>
    </header>

    <a-alert v-if="state.loadError.value" type="error" show-icon :message="state.loadError.value" class="template-permission__error">
      <template #action><a-button size="small" @click="state.loadEditor">{{ $t('ApplicationTemplate.parameters.retry') }}</a-button></template>
    </a-alert>
    <a-spin v-else :spinning="state.loadingEditor.value" class="template-permission__spin">
      <EqualHeightColumns class="template-permission__columns" height="var(--template-permission-height)" gap="0px" left-width="1.08fr" right-width="1fr" :collapsible="false">
        <template #left>
          <section class="template-permission__pane">
            <header class="template-permission__pane-header">
              <strong>{{ $t('ApplicationTemplate.permission.menus') }}</strong>
              <span class="template-permission__hint">{{ $t(state.editing.value ? 'ApplicationTemplate.permission.menuEditTip' : 'ApplicationTemplate.permission.menuViewTip') }}</span>
            </header>
            <a-tabs v-if="state.editor.ownerGroups.value.length > 1" v-model:activeKey="view.activeOwner.value" class="template-permission__owners">
              <a-tab-pane v-for="group in state.editor.ownerGroups.value" :key="group.key" :tab="ownerLabels[group.key] || group.label" />
            </a-tabs>
            <div v-if="view.menuRows.value.length" class="template-permission__menu-scroll" :class="{ 'template-permission__menu-scroll--view': !state.editing.value }">
              <a-table size="small" :show-header="false" :columns="columns" :data-source="view.menuRows.value" :pagination="false" :expanded-row-keys="view.expandedKeys.value" :row-class-name="view.rowClassName" row-key="id" @expandedRowsChange="view.setExpandedKeys">
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'menu'">
                    <a-checkbox v-if="state.editing.value" :checked="record.menu._granted" :indeterminate="record.menu.indeterminate" :disabled="view.disabled.value || state.editor.isProtectedMenu(record.menu)" @change="view.toggleMenu(record.id, $event.target.checked)">{{ record.name }}</a-checkbox>
                    <span v-else :class="{ 'template-permission__muted': !record.menu.granted }">{{ record.name }}</span>
                  </template>
                  <div v-else class="template-permission__buttons">
                    <template v-if="state.editing.value && record.buttons.length">
                      <a-checkbox v-for="button in record.buttons" :key="button.id" :checked="button.granted" :disabled="view.disabled.value || state.editor.isProtectedButton(record.menu, button)" @change="view.toggleButton(record.id, button.id, $event.target.checked)">{{ button.i18nName || button.name || button.id }}</a-checkbox>
                    </template>
                    <template v-else-if="record.grantedButtons.length">
                      <span v-for="button in record.grantedButtons" :key="button.id">{{ button.i18nName || button.name || button.id }}</span>
                    </template>
                    <span v-else class="template-permission__muted">{{ $t(record.menu.granted ? 'ApplicationTemplate.permission.granted' : 'Basis.Config.notConfigured') }}</span>
                  </div>
                </template>
              </a-table>
            </div>
            <CloudEmpty v-else class="template-permission__empty" :description="$t('ApplicationTemplate.permission.noMenus')" />
          </section>
        </template>

        <template #right>
          <section class="template-permission__pane">
            <header class="template-permission__pane-header template-permission__pane-header--assets">
              <strong>{{ $t('ApplicationTemplate.permission.assets') }}</strong>
              <a-button v-if="state.editing.value" size="small" :disabled="!view.canBatch.value" :aria-expanded="view.batchOpen.value" @click="view.toggleBatch">
                <template #icon><AIcon type="ThunderboltOutlined" /></template>
                {{ $t('ApplicationTemplate.permission.batch') }}
              </a-button>
            </header>
            <div v-if="view.assetRows.value.length" class="template-permission__asset-scroll">
              <section v-if="state.editing.value && view.batchOpen.value" class="template-permission__batch">
                <div class="template-permission__range">
                  <span class="template-permission__field-label">{{ $t('ApplicationTemplate.config.scopeStrategyLabel') }}</span>
                  <a-radio-group v-model:value="view.batchStrategy.value" :options="state.scopeStrategyOptions.value" :disabled="view.disabled.value" />
                </div>
                <div class="template-permission__range">
                  <span class="template-permission__field-label">{{ $t('ApplicationTemplate.permission.accessScope') }}</span>
                  <a-radio-group v-if="state.editor.batchAssetOptions.value.length" v-model:value="view.batchSupportId.value" :options="state.editor.batchAssetOptions.value" :disabled="view.disabled.value" />
                  <span v-else class="template-permission__muted">{{ $t('ApplicationTemplate.permission.noCommonScope') }}</span>
                </div>
                <footer class="template-permission__batch-footer">
                  <span>{{ $t('ApplicationTemplate.permission.batchTip', { count: view.assetRows.value.length }) }}</span>
                  <a-button size="small" type="primary" :disabled="!view.canApplyBatch.value" @click="view.applyBatch">{{ $t('ApplicationTemplate.permission.apply') }}</a-button>
                </footer>
              </section>

              <section v-for="asset in view.assetRows.value" :key="asset.assetType" class="template-permission__asset">
                <header class="template-permission__asset-header">
                  <strong>{{ asset.name || asset.assetType }}</strong>
                  <div class="template-permission__strategy">
                    <span class="template-permission__field-label">{{ $t('ApplicationTemplate.config.scopeStrategyLabel') }}</span>
                    <a-select v-if="state.editing.value" size="small" :value="asset.strategy" :options="state.scopeStrategyOptions.value" :disabled="view.disabled.value || !state.scopeStrategyOptions.value.length" :placeholder="$t('ApplicationTemplate.config.scopeStrategyPlaceholder')" @update:value="view.setScopeStrategy(asset.assetType, $event)" />
                    <span v-else>{{ asset.strategyLabel || $t('Basis.Config.notConfigured') }}</span>
                  </div>
                </header>
                <div class="template-permission__range template-permission__asset-range">
                  <span class="template-permission__field-label">{{ $t('ApplicationTemplate.permission.accessScope') }}</span>
                  <a-radio-group v-if="state.editing.value && asset.accesses.length" :value="asset.selectedSupportId" :disabled="view.disabled.value" @update:value="view.setAssetAccess(asset.assetType, $event)">
                    <a-radio v-for="access in asset.accesses" :key="access.supportId" :value="access.supportId" :disabled="access.disabled">{{ access.i18nName || access.name || access.supportId }}</a-radio>
                  </a-radio-group>
                  <span v-else>{{ asset.supportLabel || $t('Basis.Config.notConfigured') }}</span>
                </div>
              </section>
            </div>
            <CloudEmpty v-else class="template-permission__empty">
              <template #description>
                <template v-if="view.hasGrantedMenus.value">{{ $t('ApplicationTemplate.permission.noAssets') }}</template>
                <template v-else>
                  <div>{{ $t(state.editing.value ? 'ApplicationTemplate.permission.selectMenu' : 'ApplicationTemplate.permission.empty') }}</div>
                  <p v-if="state.canUpdate.value" class="template-permission__empty-tip">{{ $t(state.editing.value ? 'ApplicationTemplate.permission.selectMenuTip' : 'ApplicationTemplate.permission.emptyTip') }}</p>
                </template>
              </template>
            </CloudEmpty>
          </section>
        </template>
      </EqualHeightColumns>
    </a-spin>
  </section>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ApplicationTemplateMenuConfigState } from './useApplicationTemplateMenuConfig'
import { useApplicationTemplatePermissionView } from './useApplicationTemplatePermissionView'

const props = defineProps({
  state: { type: Object as PropType<ApplicationTemplateMenuConfigState>, required: true },
})
const { t: $t } = useI18n()
const view = useApplicationTemplatePermissionView(props.state)
const columns = [{ key: 'menu', width: '44%' }, { key: 'action' }]
const ownerLabels = computed<Record<string, string>>(() => ({
  iot: $t('ApplicationTemplate.config.menuOwnerIot'),
  cloud: $t('ApplicationTemplate.config.menuOwnerCloud'),
  default: $t('ApplicationTemplate.config.menuOwnerDefault'),
}))
</script>

<style scoped>
.template-permission { --template-permission-height: clamp(24rem, calc(100vh - 25rem), 42rem); min-width: 0; border: 1px solid var(--line); border-radius: var(--r-3); background: var(--bg); overflow: clip; }
.template-permission__toolbar { position: sticky; top: 0; z-index: 1; min-height: 3.5rem; display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--line); background: var(--bg); }
.template-permission__toolbar h2 { margin: 0; color: var(--ink-1); font-size: var(--fs-14); font-weight: 600; }
.template-permission__pane { height: 100%; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.template-permission__pane-header { min-height: 2.75rem; flex-shrink: 0; display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2); padding: var(--space-2) var(--space-4); border-bottom: 1px solid var(--line); }
.template-permission__pane-header--assets { justify-content: space-between; }
.template-permission__hint, .template-permission__muted, .template-permission__field-label, .template-permission__empty-tip { color: var(--ink-3); }
.template-permission__hint, .template-permission__field-label, .template-permission__empty-tip, .template-permission__batch-footer { font-size: var(--fs-12); }
.template-permission__owners { flex-shrink: 0; padding: 0 var(--space-4); }
.template-permission__menu-scroll, .template-permission__asset-scroll { flex: 1; min-height: 0; overflow: auto; }
.template-permission__menu-scroll :deep(.ant-table) { background: transparent; }
.template-permission__menu-scroll--view :deep(.ant-table-row-expand-icon) { display: none; }
.template-permission__menu-scroll :deep(.ant-table-tbody > tr > td) { padding: var(--space-2) var(--space-3); border-color: var(--line); overflow-wrap: anywhere; }
.template-permission__menu-scroll :deep(.template-permission__child > td) { background: var(--bg-sunken); }
.template-permission__buttons { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: var(--space-1) var(--space-2); }
.template-permission__buttons :deep(.ant-checkbox-wrapper) { margin-inline-start: 0; }
.template-permission__asset-scroll { padding: var(--space-3) var(--space-4); }
.template-permission__asset, .template-permission__batch { margin-bottom: var(--space-3); border: 1px solid var(--line); border-radius: var(--r-3); overflow: hidden; }
.template-permission__asset-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-2); padding: var(--space-3); background: var(--bg-sunken); border-bottom: 1px solid var(--line); }
.template-permission__asset-header strong { min-width: 0; overflow-wrap: anywhere; }
.template-permission__strategy { display: flex; align-items: center; gap: var(--space-2); }
.template-permission__strategy :deep(.ant-select) { width: 9rem; }
.template-permission__range { display: flex; align-items: flex-start; gap: var(--space-2); min-width: 0; }
.template-permission__field-label { flex-shrink: 0; padding-top: var(--space-1); }
.template-permission__range :deep(.ant-radio-group) { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-2); min-width: 0; }
.template-permission__range :deep(.ant-radio-wrapper) { margin-inline-end: 0; }
.template-permission__asset-range { padding: var(--space-3); }
.template-permission__batch { padding: var(--space-3); background: var(--bg-sunken); border-style: dashed; }
.template-permission__batch > .template-permission__range + .template-permission__range { margin-top: var(--space-2); }
.template-permission__batch-footer { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); padding-top: var(--space-2); margin-top: var(--space-3); border-top: 1px dashed var(--line); color: var(--ink-3); }
.template-permission__empty { flex: 1; min-height: 16rem; display: flex; align-items: center; justify-content: center; padding: var(--space-4); }
.template-permission__empty-tip { margin: var(--space-2) 0 0; }
.template-permission__error { margin: var(--space-4); }
@media (max-width: 60rem) {
  .template-permission { --template-permission-height: auto; }
  .template-permission__columns { grid-template-columns: minmax(0, 1fr); }
  .template-permission__columns::before { display: none; }
  .template-permission__columns :deep(.equal-height-columns__pane) { grid-area: auto; }
  .template-permission__pane { height: 26rem; }
  .template-permission__columns :deep(.equal-height-columns__pane--right) { border-top: 1px solid var(--line); }
}
</style>
