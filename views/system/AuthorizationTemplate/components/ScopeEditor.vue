<template>
  <div class="authorization-scope-editor">
    <div v-if="value.length" class="authorization-scope-editor__summary">
      {{ $t('AuthorizationTemplate.ScopeEditor.summary', [value.length, actionCount]) }}
    </div>
    <PermissionChoose
      :first-width="6"
      max-height="360px"
      :value="value"
      :disabled="disabled"
      :search-placeholder="$t('AuthorizationTemplate.ScopeEditor.searchPlaceholder')"
      :name-title="$t('AuthorizationTemplate.ScopeEditor.permissionDomain')"
      :action-title="$t('AuthorizationTemplate.ScopeEditor.permissionAction')"
      @update:value="onChange"
    />
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import PermissionChoose from '../../Menu/components/PermissionChoose.vue'
import type { ScopePermission } from '../typings'

const props = defineProps({
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

const actionCount = computed(() => {
  return (props.value || []).reduce((total, item) => total + (item.actions?.length || 0), 0)
})

const onChange = (value: ScopePermission[]) => {
  emits('update:value', value)
}
</script>

<style lang="less" scoped>
.authorization-scope-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;

  &__summary {
    color: rgba(0, 0, 0, 0.65);
    font-size: 14px;
    line-height: 22px;
  }
}
</style>
