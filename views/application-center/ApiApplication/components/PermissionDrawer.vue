<template>
  <JlDrawerShell
    :open="open"
    :width="680"
    icon="SafetyCertificateOutlined"
    :title="$t('ApiApplication.permission.title')"
    :sub="application?.name"
    @update:open="emit('update:open', $event)"
  >
    <a-alert
      type="info"
      show-icon
      :message="$t('ApiApplication.permission.description')"
    />
    <a-spin :spinning="loading">
      <a-empty v-if="!groups.length" :description="$t('ApiApplication.permission.empty')" />
      <a-collapse v-else v-model:active-key="activeKeys" accordion>
        <a-collapse-panel v-for="group in groups" :key="group.id">
          <template #header>
            <div class="group-header">
              <a-checkbox
                :checked="isGroupSelected(group)"
                :indeterminate="isGroupIndeterminate(group)"
                @click.stop
                @change="toggleGroup(group)"
              />
              <span class="group-name">{{ group.name }}</span>
              <span class="group-count">{{ selectedCount(group) }}/{{ (group.operations || []).length }}</span>
            </div>
          </template>
          <a-checkbox-group
            :value="selectedByGroup[group.id] || []"
            class="operation-list"
            @update:value="value => updateGroup(group, value as string[])"
          >
            <a-checkbox v-for="operation in group.operations || []" :key="operation.id" :value="operation.id">
              <span>{{ operation.name || operation.id }}</span>
              <small v-if="operation.description">{{ operation.description }}</small>
            </a-checkbox>
          </a-checkbox-group>
        </a-collapse-panel>
      </a-collapse>
    </a-spin>
    <template #foot>
      <a-button @click="emit('update:open', false)">{{ $t('ApiApplication.actions.cancel') }}</a-button>
      <a-button type="primary" :loading="saving" :disabled="loading" @click="save">
        {{ $t('ApiApplication.actions.save') }}
      </a-button>
    </template>
  </JlDrawerShell>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { onlyMessage } from '@jetlinks-web/utils'
import { useI18n } from 'vue-i18n'
import {
  queryApiGrants,
  queryApiGroups,
  saveApiGrants,
} from '@authentication-manager-ui/api/application-center/apiApplication'
import type { ApiApplication, ApiGroup, ApiGroupGrant } from '../types'

const props = defineProps<{ open: boolean; application?: ApiApplication }>()
const emit = defineEmits<{ (event: 'update:open', value: boolean): void; (event: 'saved'): void }>()
const { t: $t } = useI18n()
const groups = ref<ApiGroup[]>([])
const selectedByGroup = ref<Record<string, string[]>>({})
const activeKeys = ref<string[]>([])
const loading = ref(false)
const saving = ref(false)

const operationIds = (group: ApiGroup) => (group.operations || []).map(item => item.id)
const selectedCount = (group: ApiGroup) => (selectedByGroup.value[group.id] || []).length
const isGroupSelected = (group: ApiGroup) => selectedCount(group) === operationIds(group).length && operationIds(group).length > 0
const isGroupIndeterminate = (group: ApiGroup) => selectedCount(group) > 0 && !isGroupSelected(group)

const load = async () => {
  if (!props.application?.id) return
  loading.value = true
  try {
    const [groupsResponse, grantsResponse] = await Promise.all([
      queryApiGroups({ paging: false }),
      queryApiGrants(props.application.id),
    ])
    groups.value = (groupsResponse as any).result || groupsResponse || []
    const grants = (grantsResponse as any).result || grantsResponse || [] as ApiGroupGrant[]
    const map: Record<string, string[]> = {}
    ;(grants as ApiGroupGrant[]).forEach(grant => { map[grant.groupId] = grant.operationIds || [] })
    selectedByGroup.value = map
  } finally {
    loading.value = false
  }
}

watch(() => [props.open, props.application?.id], ([open]) => { if (open) void load() }, { immediate: true })

const toggleGroup = (group: ApiGroup) => {
  selectedByGroup.value[group.id] = isGroupSelected(group) ? [] : operationIds(group)
}

const updateGroup = (group: ApiGroup, values: string[]) => {
  selectedByGroup.value[group.id] = values
}

const save = async () => {
  if (!props.application?.id) return
  saving.value = true
  try {
    const grants: ApiGroupGrant[] = groups.value
      .map(group => ({
        targetType: 'api-client',
        targetId: props.application?.id,
        groupId: group.id,
        operationIds: selectedByGroup.value[group.id] || [],
        ...(group.accessSupport && String((group.accessSupport as any).value || group.accessSupport) === 'support'
          ? { assetAccesses: { assetType: group.assetType || 'device', accesses: [{ supportId: 'business_application' }] } }
          : {}),
      }))
      .filter(grant => grant.operationIds?.length)
    await saveApiGrants(props.application.id, grants)
    onlyMessage($t('ApiApplication.message.permissionSaved'))
    emit('saved')
    emit('update:open', false)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.group-header { display: flex; align-items: center; gap: var(--space-2); min-width: 0; }
.group-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.group-count { color: var(--ink-4); font-size: var(--fs-12); }
.operation-list { display: grid; gap: var(--space-2); }
.operation-list :deep(.ant-checkbox-wrapper) { display: flex; align-items: flex-start; gap: var(--space-1); }
.operation-list small { display: block; color: var(--ink-4); }
</style>
