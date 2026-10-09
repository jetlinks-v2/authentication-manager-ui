<template>
  <div class="operations-editor">
    <div class="section-head">
      <p>{{ $t('ApiGroupManagement.operation.hint') }}</p>
      <a-button v-if="!context.readonly" @click="emit('add')"><AIcon type="PlusOutlined" />{{ $t('ApiGroupManagement.operation.add') }}</a-button>
    </div>
    <a-empty v-if="!operations.length" :description="$t('ApiGroupManagement.operation.empty')" />
    <a-card v-for="(operation, index) in operations" :key="context.rows[index].key" size="small" class="operation-card">
      <template #title>{{ $t('ApiGroupManagement.operation.position', { index: index + 1 }) }}</template>
      <template #extra>
        <a-popconfirm v-if="!context.readonly" :title="$t('ApiGroupManagement.operation.removeConfirm')" @confirm="emit('remove', index)">
          <a-button type="link" danger>{{ $t('ApiGroupManagement.operation.remove') }}</a-button>
        </a-popconfirm>
      </template>
      <a-row :gutter="24">
        <a-col :xs="24" :md="12">
          <a-form-item :label="$t('ApiGroupManagement.operation.id')" required>
            <a-input :value="operation.id" :disabled="context.readonly || context.rows[index].locked" :placeholder="$t('ApiGroupManagement.operation.idPlaceholder')"
              @update:value="emit('update', index, { id: $event })" />
            <div class="field-hint">{{ $t(context.rows[index].locked ? 'ApiGroupManagement.operation.idLocked' : 'ApiGroupManagement.operation.idHint') }}</div>
          </a-form-item>
        </a-col>
        <a-col :xs="24" :md="12">
          <a-form-item :label="$t('ApiGroupManagement.operation.name')">
            <a-input :value="operation.name" :disabled="context.readonly" @update:value="emit('update', index, { name: $event })" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item :label="$t('ApiGroupManagement.operation.description')">
        <a-textarea :value="operation.description" :disabled="context.readonly" :auto-size="{ minRows: 2, maxRows: 4 }" @update:value="emit('update', index, { description: $event })" />
      </a-form-item>
      <div class="spec-head">
        <strong>{{ $t('ApiGroupManagement.operation.specs') }} ({{ operation.apiSpecIds.length }})</strong>
        <a-button v-if="!context.readonly" :disabled="!context.canSelectSpecs" @click="emit('select', index)">{{ $t('ApiGroupManagement.selectSpecs') }}</a-button>
      </div>
      <p v-if="!operation.apiSpecIds.length" class="field-hint">{{ $t('ApiGroupManagement.operation.specsRequired') }}</p>
      <div v-else class="linked-specs">
        <div v-for="specId in operation.apiSpecIds" :key="specId" class="linked-spec">
          <template v-if="specs[specId]">
            <div><a-tag>{{ specs[specId].method }}</a-tag><a-typography-text code>{{ specs[specId].path }}</a-typography-text><span class="spec-summary">{{ specs[specId].summary }}</span></div>
            <div class="spec-details">{{ $t('ApiGroupManagement.spec.appId') }}: {{ specs[specId].appId || '-' }} · {{ $t('ApiGroupManagement.spec.permissionId') }}: {{ specs[specId].permissionId || '-' }} · {{ $t('ApiGroupManagement.spec.actions') }}: {{ specs[specId].actions?.join(', ') || '-' }}</div>
          </template>
          <a-tag v-else color="warning">{{ $t('ApiGroupManagement.spec.metadataUnavailable') }}</a-tag>
          <div class="spec-details"><a-typography-text copyable :content="specId">{{ specId }}</a-typography-text></div>
          <a-tag v-if="specs[specId] && !validSpecPermission(specs[specId])" color="warning">{{ $t('ApiGroupManagement.spec.noPermissionMapping') }}</a-tag>
        </div>
      </div>
    </a-card>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ManagedApiOperation, RawOpenApiSpec } from '@authentication-manager-ui/api/application-center/apiGroupManagement'
import type { OperationEditorContext } from '../useApiGroupEditor'
import { validSpecPermission } from '../groupUtils'
defineProps<{ operations: ManagedApiOperation[]; specs: Record<string, RawOpenApiSpec>; context: OperationEditorContext }>()
const emit = defineEmits<{
  (event: 'add'): void
  (event: 'remove' | 'select', index: number): void
  (event: 'update', index: number, patch: Partial<Pick<ManagedApiOperation, 'id' | 'name' | 'description'>>): void
}>()
const { t: $t } = useI18n()
</script>
<style scoped>
.section-head, .spec-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.section-head p { margin: 0; color: var(--ink-4); }.operation-card + .operation-card { margin-top: 16px; }
.field-hint, .spec-details { color: var(--ink-4); font-size: var(--fs-12); margin-top: 4px; overflow-wrap: anywhere; }
.linked-specs { max-height: min(420px, 50vh); overflow-y: auto; overscroll-behavior: contain; background: var(--bg); border: 1px solid #eff0f1; border-radius: 4px; padding: 0 12px; }
.linked-spec { padding: 12px 0; overflow-wrap: anywhere; }.linked-spec + .linked-spec { border-top: 1px solid #eff0f1; }
.spec-summary { margin-left: 12px; color: var(--ink-4); }
@media(max-width: 720px) { .section-head { align-items: flex-start; flex-direction: column; } }
</style>
