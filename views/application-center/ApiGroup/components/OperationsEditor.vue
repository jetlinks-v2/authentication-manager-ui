<template>
  <div>
    <div class="section-head">
      <p>{{ $t('ApiGroupManagement.operation.hint') }}</p>
      <a-button v-if="!context.readonly" @click="emit('add')"><AIcon type="PlusOutlined" />{{ $t('ApiGroupManagement.operation.add') }}</a-button>
    </div>
    <a-empty v-if="!operations.length" :description="$t('ApiGroupManagement.operation.empty')" />
    <a-collapse v-else v-model:activeKey="expanded">
      <a-collapse-panel v-for="(operation, index) in operations" :key="context.rows[index].key">
        <template #header>
          <a-space wrap><strong>{{ operation.name || $t('ApiGroupManagement.operation.position', { index: index + 1 }) }}</strong>
            <span class="operation-code">{{ operation.id }}</span><a-tag>{{ $t('ApiGroupManagement.spec.selectedCount', { count: operation.apiSpecIds.length }) }}</a-tag>
          </a-space>
        </template>
        <template #extra>
          <div v-if="!context.readonly" @click.stop>
            <a-popconfirm :title="$t('ApiGroupManagement.operation.removeConfirm')" @confirm="emit('remove', index)">
              <a-button type="link" size="small" danger>{{ $t('ApiGroupManagement.operation.remove') }}</a-button>
            </a-popconfirm>
          </div>
        </template>
        <a-row :gutter="24" class="operation-fields">
          <a-col :xs="24" :md="12"><a-form-item :label="$t('ApiGroupManagement.operation.name')">
            <a-input :value="operation.name" :disabled="context.readonly" @update:value="emit('update', index, { name: $event })" />
          </a-form-item></a-col>
          <a-col :xs="24" :md="12"><a-form-item required>
            <template #label><a-space>{{ $t('ApiGroupManagement.operation.id') }}<a-tooltip :title="$t(context.rows[index].locked ? 'ApiGroupManagement.operation.idLocked' : 'ApiGroupManagement.operation.idHint')"><AIcon type="InfoCircleOutlined" /></a-tooltip></a-space></template>
            <a-input :value="operation.id" :disabled="context.readonly || context.rows[index].locked" :placeholder="$t('ApiGroupManagement.operation.idPlaceholder')" @update:value="emit('update', index, { id: $event })" />
          </a-form-item></a-col>
          <a-col :span="24"><a-form-item :label="$t('ApiGroupManagement.operation.description')">
            <a-input :value="operation.description" :disabled="context.readonly" @update:value="emit('update', index, { description: $event })" />
          </a-form-item></a-col>
        </a-row>
        <div class="spec-head"><strong>{{ $t('ApiGroupManagement.operation.specs') }} ({{ operation.apiSpecIds.length }})</strong>
          <a-button v-if="!context.readonly" :disabled="!context.canSelectSpecs" @click="emit('select', index)">{{ $t('ApiGroupManagement.selectSpecs') }}</a-button>
        </div>
        <LinkedSpecs v-if="operation.apiSpecIds.length" :ids="operation.apiSpecIds" :specs="specs" />
        <a-empty v-else :description="$t('ApiGroupManagement.operation.specsRequired')" />
      </a-collapse-panel>
    </a-collapse>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ManagedApiOperation, RawOpenApiSpec } from '@authentication-manager-ui/api/application-center/apiGroupManagement'
import type { OperationEditorContext } from '../useApiGroupEditor'
import LinkedSpecs from './LinkedSpecs.vue'
const props = defineProps<{ operations: ManagedApiOperation[]; specs: Record<string, RawOpenApiSpec>; context: OperationEditorContext }>()
const emit = defineEmits<{
  (event: 'add'): void
  (event: 'remove' | 'select', index: number): void
  (event: 'update', index: number, patch: Partial<Pick<ManagedApiOperation, 'id' | 'name' | 'description'>>): void
}>()
const { t: $t } = useI18n()
const expanded = ref<number[]>([])
watch(() => props.context.rows.map(row => row.key), (keys, previous = []) => {
  expanded.value = previous.length ? [...expanded.value.filter(key => keys.includes(key)), ...keys.filter(key => !previous.includes(key))] : keys.slice(0, 1)
}, { immediate: true })
</script>
<style scoped>
.section-head, .spec-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.section-head p { margin: 0; color: var(--ink-4); }.operation-code { color: var(--ink-4); font-size: var(--fs-12); }
.operation-fields :deep(.ant-form-item) { margin-bottom: 12px; }
@media(max-width: 720px) { .section-head { align-items: flex-start; flex-direction: column; } }
</style>
