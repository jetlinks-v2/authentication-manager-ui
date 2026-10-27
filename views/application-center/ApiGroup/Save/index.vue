<template>
  <DefineTextFeedback v-slot="{ field }">
    <div v-if="textState[field].saving || textState[field].error" class="field-feedback"
      :class="{ 'field-feedback--error': textState[field].error }" :role="textState[field].error ? 'alert' : 'status'">
      <template v-if="textState[field].saving"><a-spin size="small" />{{ $t('ApiGroupManagement.saving') }}</template>
      <template v-else>
        <AIcon type="ExclamationCircleOutlined" />{{ textState[field].error }}
        <a-button type="link" size="small" :disabled="saving" @click="saveText(field, draft[field] || '')">{{ $t('ApiGroupManagement.retry') }}</a-button>
      </template>
    </div>
  </DefineTextFeedback>
  <j-page-container>
    <div class="group-detail">
      <PageChrome>
        <DetailHeader :title="group?.name || $t(id ? 'ApiGroupManagement.viewTitle' : 'ApiGroupManagement.createTitle')"
          show-back :back-title="$t('ApiGroupManagement.back')" @back="back">
          <template v-if="group && canUpdate" #title>
            <Editable class="group-name" :value="draft.name"
              :component-props="{ maxlength: 64, disabled: saving || textState.name.saving, 'aria-label': $t('ApiGroupManagement.name') }"
              @change="saveText('name', $event)" />
          </template>
          <template v-if="group" #titleExtra>
            <a-tag :color="groupValue(group.status) === 'enabled' ? 'green' : 'default'">
              {{ groupText(group.status, $t, 'ApiGroupManagement.state.') }}
            </a-tag>
          </template>
          <template v-if="group && (textState.name.saving || textState.name.error)" #description><TextFeedback field="name" /></template>
          <template v-if="group" #info>
            <a-descriptions size="small" :column="1">
              <a-descriptions-item :label="$t('ApiGroupManagement.groupId')">
                <a-typography-text copyable :content="group.id">{{ group.id }}</a-typography-text>
              </a-descriptions-item>
              <a-descriptions-item :label="$t('ApiGroupManagement.description')">
                <div class="description-field">
                  <a-textarea v-if="canUpdate" v-model:value="draft.description" class="group-description" :bordered="false"
                    :auto-size="{ minRows: 1, maxRows: 4 }" :disabled="saving || textState.description.saving"
                    :placeholder="$t('ApiGroupManagement.addDescription')" :aria-label="$t('ApiGroupManagement.description')"
                    @blur="saveText('description', draft.description || '')" />
                  <span v-else class="group-description">{{ group.description || '—' }}</span>
                  <TextFeedback field="description" />
                </div>
              </a-descriptions-item>
            </a-descriptions>
          </template>
          <template v-if="group" #actions>
            <j-permission-button :hasPermission="groupMenu + ':action'" :loading="saving" :disabled="busy || loading"
              :popConfirm="{ title: $t(groupValue(group.status) === 'enabled' ? 'ApiGroupManagement.disableConfirm' : 'ApiGroupManagement.enableConfirm'), onConfirm: toggle }">
              <AIcon :type="groupValue(group.status) === 'enabled' ? 'StopOutlined' : 'CheckCircleOutlined'" />
              {{ $t(groupValue(group.status) === 'enabled' ? 'ApiGroupManagement.disable' : 'ApiGroupManagement.enable') }}
            </j-permission-button>
          </template>
        </DetailHeader>
      </PageChrome>
      <a-alert v-if="error && !picker.open" type="error" show-icon :message="error" class="detail-alert" />
      <a-spin :spinning="loading">
        <template v-if="ready">
          <a-form v-if="!id" layout="vertical" class="create-form" :model="draft">
            <a-form-item :label="$t('ApiGroupManagement.name')" required>
              <a-input v-model:value="draft.name" :maxlength="64" :disabled="!editable" :placeholder="$t('ApiGroupManagement.namePlaceholder')" />
            </a-form-item>
            <a-form-item :label="$t('ApiGroupManagement.description')">
              <a-textarea v-model:value="draft.description" :disabled="!editable" :auto-size="{ minRows: 2, maxRows: 4 }" />
            </a-form-item>
            <a-form-item :label="$t('ApiGroupManagement.status')" required>
              <a-select v-model:value="draft.status" :options="statusOptions" :disabled="!editable" />
            </a-form-item>
            <p class="create-hint">{{ $t('ApiGroupManagement.createHint') }}</p>
            <j-permission-button :hasPermission="groupMenu + ':add'" type="primary" @click="createGroup" :loading="saving" :disabled="!editable || !draft.name.trim()">
              {{ $t('ApiGroupManagement.create') }}
            </j-permission-button>
          </a-form>
          <a-alert v-if="group && specError" type="warning" show-icon :message="specError" class="detail-alert" />
          <a-alert v-else-if="group && unavailable.length" type="warning" show-icon :message="$t('ApiGroupManagement.spec.unavailableCount', { count: unavailable.length })" class="detail-alert" />
          <OperationsEditor :operations="operations" :specs="specs" :context="operationContext"
            @activate="selectOperation" @add="addOperation" @remove="removeOperation" @update="updateOperation" @select="selectSpecs" />
        </template>
      </a-spin>
      <SpecPicker v-bind="picker" @close="closePicker" @confirm="acceptSelection">
        <template v-if="picker.context.creating" #configuration>
          <a-form layout="vertical" class="new-item-form" :model="newItem">
            <a-row :gutter="16">
              <a-col :xs="24" :md="12">
                <a-form-item :label="$t('ApiGroupManagement.operation.name')">
                  <a-input v-model:value="newItem.name" :disabled="saving" :placeholder="$t('ApiGroupManagement.operation.namePlaceholder')" />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :md="12">
                <a-form-item :label="$t('ApiGroupManagement.operation.id')" required>
                  <a-input v-model:value="newItem.id" :disabled="saving" :placeholder="$t('ApiGroupManagement.operation.idPlaceholder')" />
                </a-form-item>
              </a-col>
            </a-row>
            <a-form-item :label="$t('ApiGroupManagement.operation.description')">
              <a-input v-model:value="newItem.description" :disabled="saving" :placeholder="$t('ApiGroupManagement.operation.descriptionPlaceholder')" />
            </a-form-item>
          </a-form>
        </template>
      </SpecPicker>
    </div>
  </j-page-container>
</template>
<script setup lang="ts" name="ApiGroupSave">
import { createReusableTemplate } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { useApiGroupEditor, type GroupTextField } from '../useApiGroupEditor'
import { groupText, groupValue } from '../groupUtils'
import OperationsEditor from '../components/OperationsEditor.vue'
import SpecPicker from '../components/SpecPicker.vue'
const { t: $t } = useI18n()
const { groupMenu, id, group, draft, operations, newItem, loading, saving, ready, error, specError, canUpdate, editable,
  busy, textState, statusOptions, unavailable, specs, operationContext, picker,
  saveText, selectOperation, addOperation, updateOperation, removeOperation, selectSpecs, closePicker, acceptSelection, toggle, createGroup, back } = useApiGroupEditor()
const [DefineTextFeedback, TextFeedback] = createReusableTemplate<{ field: GroupTextField }>()
</script>
<style scoped>
.group-detail { min-width: 0; min-height: 100%; }
.group-name { min-width: 12rem; max-width: 36rem; padding: 0; overflow-wrap: anywhere; }
.description-field { width: 100%; }
.group-description { width: 100%; margin: 0; padding: 0; color: var(--ink-2); line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }
.group-description:not(:disabled):hover { background: var(--bg-sunken); }
.group-description:focus { box-shadow: 0 0 0 1px var(--accent); }
.field-feedback { display: flex; align-items: center; gap: var(--space-2); color: var(--ink-4); font-size: var(--fs-12); }
.field-feedback--error { color: var(--danger); }
.field-feedback .ant-btn { height: auto; padding: 0; font-size: inherit; }
.detail-alert { margin-bottom: var(--space-3); }
.create-form { max-width: 42rem; padding: var(--space-5); }
.create-hint { margin-bottom: var(--space-4); color: var(--ink-4); }
.new-item-form :deep(.ant-form-item) { margin-bottom: var(--space-3); }
@media (max-width: 48rem) {
  .create-form { padding: var(--space-3); }
}
</style>
