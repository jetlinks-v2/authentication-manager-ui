<template>
  <EditDialog
    v-if="open"
    :title="$t('ApiApplication.create.title')"
    :schema="schema"
    :data="form"
    :request="submit"
    @close="emit('update:open', false)"
    @save="handleSaved"
  >
    <template #businessApplicationIds="slotProps">
      <a-select
        :value="normalizeBusinessApplicationIds(slotProps.value)"
        mode="multiple"
        allow-clear
        show-search
        option-filter-prop="label"
        :loading="loadingOptions"
        :options="businessApplicationOptions"
        :placeholder="$t('ApiApplication.create.businessApplicationsPlaceholder')"
        @update:value="slotProps.update"
      />
    </template>
  </EditDialog>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ApiApplicationForm, BusinessApplication } from '../types'

const props = defineProps<{
  open: boolean
  businessApplications: BusinessApplication[]
  loadingOptions: boolean
  create: (value: ApiApplicationForm) => Promise<unknown>
  loadOptions: () => Promise<void>
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'created'): void
}>()

const { t: $t } = useI18n()
const form = reactive<ApiApplicationForm>({ name: '', description: '', businessApplicationIds: [] })

const schema = computed(() => [
  {
    name: 'name',
    label: $t('ApiApplication.create.name'),
    itemType: 'input',
    componentProps: { maxlength: 64, showCount: true, placeholder: $t('ApiApplication.create.namePlaceholder') },
    rules: [{ required: true, message: $t('ApiApplication.create.nameRequired') }],
  },
  {
    name: 'description',
    label: $t('ApiApplication.create.description'),
    itemType: 'input',
    componentProps: { type: 'textarea', rows: 3, maxlength: 200, showCount: true },
  },
  {
    name: 'businessApplicationIds',
    label: $t('ApiApplication.create.businessApplications'),
    slotName: 'businessApplicationIds',
  },
])

const businessApplicationOptions = computed(() => props.businessApplications.map(item => ({
  label: item.name,
  value: item.id,
})))

const normalizeBusinessApplicationIds = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter(id => typeof id === 'string' && id.length > 0) : []

watch(() => props.open, open => {
  if (open) {
    form.name = ''
    form.description = ''
    form.businessApplicationIds = []
    void props.loadOptions()
  }
})

const submit = async (value: ApiApplicationForm) => {
  await props.create({
    ...value,
    businessApplicationIds: normalizeBusinessApplicationIds(value.businessApplicationIds),
  })
  return { success: true }
}

const handleSaved = () => {
  emit('update:open', false)
  emit('created')
}
</script>
