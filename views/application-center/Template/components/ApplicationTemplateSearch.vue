<template>
  <div class="application-template-search">
    <a-form
      class="application-template-search__form"
      layout="inline"
      :model="draft"
      @finish="handleSearch"
    >
      <a-form-item :label="$t('ApplicationTemplate.field.name')">
        <a-input
          v-model:value="draft.name"
          allow-clear
          :placeholder="$t('ApplicationTemplate.field.namePlaceholder')"
        />
      </a-form-item>
      <a-form-item :label="$t('ApplicationTemplate.field.code')">
        <a-input
          v-model:value="draft.code"
          allow-clear
          :placeholder="$t('ApplicationTemplate.field.codePlaceholder')"
        />
      </a-form-item>
      <a-form-item :label="$t('ApplicationTemplate.field.state')">
        <a-select
          v-model:value="draft.state"
          allow-clear
          show-search
          option-filter-prop="label"
          :options="stateOptions"
          :placeholder="$t('ApplicationTemplate.field.statePlaceholder')"
        />
      </a-form-item>
      <a-form-item class="application-template-search__actions">
        <a-space>
          <a-button type="primary" html-type="submit">
            <template #icon><AIcon type="SearchOutlined" /></template>
            {{ $t('ApplicationTemplate.common.search') }}
          </a-button>
          <a-button @click="handleReset">
            <template #icon><AIcon type="ReloadOutlined" /></template>
            {{ $t('ApplicationTemplate.common.reset') }}
          </a-button>
        </a-space>
      </a-form-item>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import { reactive, watch } from 'vue'
import type { ApplicationTemplateSearchModel } from '../useApplicationTemplateList'

interface SelectOption {
  label: string
  value: string
  disabled?: boolean
}

const props = defineProps({
  modelValue: {
    type: Object as PropType<ApplicationTemplateSearchModel>,
    default: () => ({ name: '', code: '', state: undefined }),
  },
  stateOptions: {
    type: Array as PropType<SelectOption[]>,
    default: () => [],
  },
})

const emit = defineEmits<{
  (event: 'search', model: ApplicationTemplateSearchModel): void
  (event: 'reset'): void
}>()

const draft = reactive<ApplicationTemplateSearchModel>({
  name: '',
  code: '',
  state: undefined,
})

const normalize = (model: ApplicationTemplateSearchModel): ApplicationTemplateSearchModel => ({
  name: String(model.name || '').trim(),
  code: String(model.code || '').trim(),
  state: model.state || undefined,
})

watch(
  () => props.modelValue,
  value => Object.assign(draft, normalize(value)),
  { immediate: true, deep: true },
)

const handleSearch = () => {
  emit('search', normalize(draft))
}

const handleReset = () => {
  Object.assign(draft, { name: '', code: '', state: undefined })
  emit('reset')
}
</script>

<style scoped lang="less">
.application-template-search {
  padding: var(--space-4) var(--space-4) 0;

  &__form {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3) var(--space-4);

    :deep(.ant-form-item) {
      margin-right: 0;
      margin-bottom: var(--space-3);
    }

    :deep(.ant-input),
    :deep(.ant-select) {
      width: 13.75rem;
    }
  }

  &__actions {
    flex-shrink: 0;
  }
}

@media (max-width: 48rem) {
  .application-template-search {
    &__form {
      :deep(.ant-form-item),
      :deep(.ant-input),
      :deep(.ant-select) {
        width: 100%;
      }
    }
  }
}
</style>
