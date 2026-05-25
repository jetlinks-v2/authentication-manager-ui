<template>
  <PermissionChoose
    :first-width="6"
    max-height="360px"
    :value="value"
    :disabled="disabled"
    @update:value="onChange"
  />
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import PermissionChoose from '../../Menu/components/PermissionChoose.vue'
import type { ScopePermission } from '../typings'

defineProps({
  value: {
    type: Array as PropType<ScopePermission[]>,
    default: () => [],
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emits = defineEmits(['update:value'])

const onChange = (value: ScopePermission[]) => {
  emits('update:value', value)
}
</script>
