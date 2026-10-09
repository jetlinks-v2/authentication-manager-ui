<template>
  <j-page-container>
    <div class="api-group-editor">
      <div class="page-head">
        <div>
          <a-button type="link" class="back-button" @click="back"><AIcon type="LeftOutlined" />{{ $t('ApiGroupManagement.back') }}</a-button>
          <h1>{{ $t(id ? (canSave ? 'ApiGroupManagement.editTitle' : 'ApiGroupManagement.viewTitle') : 'ApiGroupManagement.createTitle') }}</h1>
          <div v-if="id" class="group-id">{{ $t('ApiGroupManagement.groupId') }}: <a-typography-text copyable :content="id">{{ id }}</a-typography-text></div>
          <p v-else>{{ $t('ApiGroupManagement.serverGeneratedId') }}</p>
        </div>
        <j-permission-button v-if="canSave" :hasPermission="groupMenu + (id ? ':update' : ':add')" type="primary" :loading="saving" :disabled="!editable" @click="save">
          {{ $t('ApiGroupManagement.save') }}
        </j-permission-button>
      </div>
      <a-alert v-if="error" type="error" show-icon :message="error" class="page-alert" />
      <a-alert v-if="ready && !canSave" type="info" show-icon :message="$t('ApiGroupManagement.readonlyHint')" class="page-alert" />
      <a-spin :spinning="loading">
        <a-form v-if="ready" layout="vertical" :model="draft">
          <a-card :title="$t('ApiGroupManagement.basicInfo')" class="editor-section">
            <a-row :gutter="24">
              <a-col :xs="24" :md="12">
                <a-form-item :label="$t('ApiGroupManagement.name')" required>
                  <a-input v-model:value="draft.name" :maxlength="64" :disabled="!editable" :placeholder="$t('ApiGroupManagement.namePlaceholder')" />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :md="12">
                <a-form-item :label="$t('ApiGroupManagement.status')" required>
                  <a-select v-model:value="draft.status" :options="statusOptions" :disabled="!editable" />
                </a-form-item>
              </a-col>
            </a-row>
            <a-form-item :label="$t('ApiGroupManagement.description')">
              <a-textarea v-model:value="draft.description" :disabled="!editable" :auto-size="{ minRows: 2, maxRows: 4 }" />
            </a-form-item>
            <a-row :gutter="24">
              <a-col :xs="24" :md="12">
                <a-form-item :label="$t('ApiGroupManagement.accessSupport')">
                  <a-select v-model:value="draft.accessSupport" :options="accessOptions" :disabled="!editable" :placeholder="$t('ApiGroupManagement.accessPlaceholder')" />
                  <div class="field-hint">{{ $t('ApiGroupManagement.accessHint') }}</div>
                </a-form-item>
              </a-col>
              <a-col :xs="24" :md="12">
                <a-form-item :label="$t('ApiGroupManagement.assetType')" :required="draft.accessSupport === 'support'">
                  <a-select :value="draft.assetType" @update:value="setAssetType" :options="assetOptions" :disabled="!editable || !!assetError" allow-clear show-search option-filter-prop="label" :placeholder="$t('ApiGroupManagement.assetTypePlaceholder')" />
                  <div class="field-hint">{{ $t('ApiGroupManagement.assetTypeHint') }}</div>
                </a-form-item>
              </a-col>
            </a-row>
            <a-alert v-if="assetError" type="warning" show-icon :message="assetError" class="page-alert" />
            <a-alert v-else-if="assetMissing" type="warning" show-icon :message="$t('ApiGroupManagement.assetTypeMissing', { type: draft.assetType })" class="page-alert" />
            <a-alert v-if="linkedAssetTypes.length > 1" type="warning" show-icon :message="$t('ApiGroupManagement.mixedAssetTypes', { types: linkedAssetTypes.join(', ') })" class="page-alert" />
            <p v-else-if="linkedAssetTypes.length" class="field-hint">{{ $t('ApiGroupManagement.detectedAssetTypes', { types: linkedAssetTypes.join(', ') }) }}</p>
          </a-card>
          <a-card :title="$t('ApiGroupManagement.operation.sectionTitle')" class="editor-section">
            <a-alert v-if="!canSelectSpecs" type="warning" show-icon :message="$t('ApiGroupManagement.noSpecQueryPermission')" class="page-alert" />
            <a-alert v-if="specError" type="warning" show-icon :message="specError" class="page-alert" />
            <a-alert v-if="unavailable.length" type="warning" show-icon :message="$t('ApiGroupManagement.spec.unavailableCount', { count: unavailable.length })" class="page-alert" />
            <OperationsEditor :operations="draft.operations" :specs="specs" :context="operationContext" @add="addOperation" @remove="removeOperation" @update="updateOperation" @select="selectSpecs" />
          </a-card>
        </a-form>
      </a-spin>
      <SpecPicker v-bind="picker" @close="closePicker" @confirm="acceptSelection" />
    </div>
  </j-page-container>
</template>
<script setup lang="ts" name="ApiGroupSave">
import { useI18n } from 'vue-i18n'
import { useApiGroupEditor } from '../useApiGroupEditor'
import OperationsEditor from '../components/OperationsEditor.vue'
import SpecPicker from '../components/SpecPicker.vue'
const { t: $t } = useI18n()
const { groupMenu, id, draft, loading, saving, ready, error, assetError, specError, canSave, editable, canSelectSpecs,
  assetOptions, accessOptions, statusOptions, assetMissing, unavailable, linkedAssetTypes, specs, operationContext, picker,
  addOperation, updateOperation, removeOperation, setAssetType, selectSpecs, closePicker, acceptSelection, save, back } = useApiGroupEditor()
</script>
<style scoped>
.api-group-editor { padding: var(--space-4); min-height: 100%; background: var(--bg); }
.page-head { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 20px; }
h1 { margin: 4px 0; font-size: var(--fs-20); }.back-button { padding-left: 0; }
p, .group-id { margin: 4px 0 0; color: var(--ink-4); }.editor-section + .editor-section { margin-top: 20px; }
.field-hint { margin-top: 4px; color: var(--ink-4); font-size: var(--fs-12); }.page-alert { margin-bottom: 16px; }
@media(max-width: 720px) { .page-head { align-items: flex-start; } }
</style>
