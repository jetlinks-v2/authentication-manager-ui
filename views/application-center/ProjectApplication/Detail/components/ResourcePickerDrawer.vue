<template>
  <JlDrawerShell
    :open="open"
    :width="760"
    icon="AppstoreAddOutlined"
    :title="data.title"
    :sub="data.subtitle"
    @update:open="emits('update:open', $event)"
  >
    <a-segmented
      v-if="data.groupModes.length > 1"
      v-model:value="groupMode"
      block
      :options="data.groupModes"
      @change="activeGroup = ''"
    />
    <div class="resource-picker">
      <aside class="resource-groups">
        <button
          v-for="item in groupOptions"
          :key="item.value"
          type="button"
          :class="{ active: activeGroup === item.value }"
          @click="activeGroup = item.value"
        >
          <span>{{ item.label }}</span><b>{{ item.count }}</b>
        </button>
      </aside>
      <div class="resource-list">
        <a-input v-model:value="keyword" allow-clear :placeholder="$t('ProjectApplication.resource.searchPlaceholder')">
          <template #prefix><AIcon type="SearchOutlined" /></template>
        </a-input>
        <p v-if="data.hint" class="picker-hint">{{ data.hint }}</p>
        <div class="select-summary">
          <a-checkbox :checked="allVisibleSelected" @change="toggleAll">
            {{ $t('ProjectApplication.resource.selectAll') }}
          </a-checkbox>
          <span>{{ $t('ProjectApplication.resource.selected', { selected: selectedIds.length, total: filteredResources.length }) }}</span>
        </div>
        <div class="resource-items">
          <label v-for="item in filteredResources" :key="item.id" class="resource-item">
            <a-checkbox :checked="selectedIds.includes(item.id)" @change="toggleResource(item.id, $event)" />
            <span class="resource-copy">
              <strong>{{ item.name }}</strong>
              <small>{{ item.category }} · {{ item.serial }}</small>
            </span>
            <MetaChip :tone="item.status === 'online' ? 'ok' : 'warn'">{{ item.statusText }}</MetaChip>
          </label>
          <CloudEmpty v-if="!filteredResources.length" :description="$t('ProjectApplication.list.empty')" />
        </div>
      </div>
    </div>
    <template #foot>
      <StickyActionBar position="inline">
        <a-button @click="emits('update:open', false)">{{ $t('ProjectApplication.common.cancel') }}</a-button>
        <a-button type="primary" :disabled="!selectedIds.length" @click="confirm">
          {{ $t('ProjectApplication.resource.bindCount', { count: selectedIds.length }) }}
        </a-button>
      </StickyActionBar>
    </template>
  </JlDrawerShell>
</template>

<script setup lang="ts" name="ProjectApplicationResourcePickerDrawer">
import type { PropType } from 'vue'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ResourcePickerData } from '../../types'

interface CheckboxEvent { target: { checked: boolean } }

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  data: {
    type: Object as PropType<ResourcePickerData>,
    required: true,
  },
})

const emits = defineEmits(['update:open', 'confirm'])
const { t: $t } = useI18n()
const keyword = ref('')
const groupMode = ref<ResourcePickerData['groupModes'][number]['value']>('category')
const activeGroup = ref('')
const selectedIds = ref<string[]>([])

watch(() => props.open, (open) => {
  if (!open) return
  groupMode.value = props.data.groupModes[0]?.value || 'category'
  keyword.value = ''
  activeGroup.value = ''
  selectedIds.value = []
})

const selectableResources = computed(() => {
  const boundIds = new Set(props.data.boundIds)
  return props.data.resources.filter((item) => !boundIds.has(item.id))
})

const groupOptions = computed(() => {
  const counts = new Map<string, number>()
  selectableResources.value.forEach((item) => counts.set(item[groupMode.value], (counts.get(item[groupMode.value]) || 0) + 1))
  return [...counts.entries()].map(([label, count]) => ({ label, value: label, count }))
})

const filteredResources = computed(() => {
  const searchText = keyword.value.trim().toLocaleLowerCase()
  return selectableResources.value.filter((item) => {
    const matchesGroup = !activeGroup.value || item[groupMode.value] === activeGroup.value
    const matchesSearch = !searchText || `${item.name} ${item.serial}`.toLocaleLowerCase().includes(searchText)
    return matchesGroup && matchesSearch
  })
})

const allVisibleSelected = computed(() => !!filteredResources.value.length
  && filteredResources.value.every((item) => selectedIds.value.includes(item.id)))

const toggleResource = (id: string, event: CheckboxEvent) => {
  selectedIds.value = event.target.checked
    ? [...new Set([...selectedIds.value, id])]
    : selectedIds.value.filter((item) => item !== id)
}

const toggleAll = (event: CheckboxEvent) => {
  const visibleIds = filteredResources.value.map((item) => item.id)
  selectedIds.value = event.target.checked
    ? [...new Set([...selectedIds.value, ...visibleIds])]
    : selectedIds.value.filter((id) => !visibleIds.includes(id))
}

const confirm = () => {
  emits('confirm', [...selectedIds.value])
  emits('update:open', false)
}
</script>

<style scoped>
.resource-picker { display: grid; min-height: 24rem; grid-template-columns: 11rem minmax(0, 1fr); border: 1px solid var(--line); border-radius: var(--r-3); overflow: hidden; }
.resource-groups { display: flex; flex-direction: column; gap: var(--space-1); padding: var(--space-2); border-right: 1px solid var(--line); background: var(--bg-sunken); }
.resource-groups button { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); padding: var(--space-2) var(--space-3); border: 0; border-radius: var(--r-2); background: transparent; color: var(--ink-2); cursor: pointer; text-align: left; }
.resource-groups button:hover,
.resource-groups button.active { background: var(--bg); color: var(--ink-1); font-weight: 500; }
.resource-groups b { color: var(--ink-4); font-size: var(--fs-12); }
.resource-list { display: flex; min-width: 0; flex-direction: column; gap: var(--space-3); padding: var(--space-3); }
.picker-hint { margin: 0; color: var(--ink-3); font-size: var(--fs-12); }
.select-summary { display: flex; align-items: center; justify-content: space-between; color: var(--ink-4); font-size: var(--fs-12); }
.resource-items { display: flex; flex-direction: column; gap: var(--space-2); }
.resource-item { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3); border: 1px solid var(--line); border-radius: var(--r-2); cursor: pointer; }
.resource-item:hover { border-color: var(--accent); }
.resource-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: var(--space-1); }
.resource-copy strong { color: var(--ink-1); }
.resource-copy small { overflow: hidden; color: var(--ink-4); text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 42rem) { .resource-picker { grid-template-columns: 1fr; } .resource-groups { flex-direction: row; overflow-x: auto; border-right: 0; border-bottom: 1px solid var(--line); } }
</style>
