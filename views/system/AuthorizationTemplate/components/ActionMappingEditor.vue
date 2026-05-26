<template>
  <div class="authorization-action-editor">
    <aside class="authorization-action-editor__list">
      <div class="authorization-action-editor__list-head">
        <span>{{ $t('AuthorizationTemplate.field.actions') }}</span>
        <a-button type="link" size="small" @click="addAction">
          <AIcon type="PlusOutlined" />
          {{ $t('AuthorizationTemplate.action.addAction') }}
        </a-button>
      </div>

      <button
        v-for="(item, index) in value"
        :key="`${item.id}-${index}`"
        type="button"
        class="authorization-action-editor__item"
        :class="{ 'is-active': index === currentActionIndex }"
        @click="selectAction(item.id)"
      >
        <span class="authorization-action-editor__item-main">
          <b>{{ item.name || item.id || '--' }}</b>
          <small>{{ item.id || '--' }}</small>
        </span>
        <span class="authorization-action-editor__item-count">
          {{ $t('AuthorizationTemplate.actionGroup.permissionSummary', [item.permissions?.length || 0]) }}
        </span>
        <a-button
          type="text"
          size="small"
          danger
          :disabled="value.length <= 1"
          @click.stop="removeAction(index)"
        >
          <AIcon type="DeleteOutlined" />
        </a-button>
      </button>
    </aside>

    <section v-if="currentAction" class="authorization-action-editor__detail">
      <div class="authorization-action-editor__detail-head">
        <div>
          <strong>{{ currentAction.name || currentAction.id }}</strong>
          <p>{{ $t('AuthorizationTemplate.actionGroup.detailSub') }}</p>
        </div>
        <a-tag>{{ currentAction.id }}</a-tag>
      </div>

      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item :label="$t('AuthorizationTemplate.field.actionId')" required>
            <a-input
              :value="currentAction.id"
              :placeholder="$t('AuthorizationTemplate.placeholder.actionId')"
              @update:value="updateCurrentAction({ id: $event })"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item :label="$t('AuthorizationTemplate.field.actionName')" required>
            <a-input
              :value="currentAction.name"
              :placeholder="$t('AuthorizationTemplate.placeholder.actionName')"
              @update:value="updateCurrentAction({ name: $event })"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item :label="$t('AuthorizationTemplate.field.actionDescription')">
            <a-input
              :value="currentAction.description"
              :placeholder="$t('AuthorizationTemplate.placeholder.actionDescription')"
              @update:value="updateCurrentAction({ description: $event })"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item :label="$t('AuthorizationTemplate.field.actionPermission')" required>
        <ScopeEditor
          :value="currentPermissions"
          @update:value="updateCurrentPermissions"
        />
      </a-form-item>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import ScopeEditor from './ScopeEditor.vue'
import type { AuthorizationTemplateAction, ScopePermission } from '../typings'
import {
  fromGrantScopePermissions,
  toGrantScopePermissions,
} from '../actionUtil'

const { t: $t } = useI18n()

const props = defineProps({
  value: {
    type: Array as PropType<AuthorizationTemplateAction[]>,
    default: () => [],
  },
  activeId: {
    type: String,
    default: '',
  },
})

const emits = defineEmits(['update:value', 'update:activeId'])

const currentActionIndex = computed(() => {
  const index = props.value.findIndex((item) => item.id === props.activeId)
  return index >= 0 ? index : 0
})

const currentAction = computed(() => {
  return props.value[currentActionIndex.value]
})

const currentPermissions = computed(() => fromGrantScopePermissions(currentAction.value?.permissions))

const emitActions = (actions: AuthorizationTemplateAction[], activeId?: string) => {
  emits('update:value', actions)
  emits('update:activeId', activeId || actions[0]?.id || '')
}

const selectAction = (id: string) => {
  emits('update:activeId', id)
}

const updateCurrentAction = (patch: Partial<AuthorizationTemplateAction>) => {
  if (!currentAction.value) {
    return
  }
  const nextId = patch.id ?? currentAction.value.id
  const actions = props.value.map((item, index) => (
    index === currentActionIndex.value
      ? { ...item, ...patch }
      : item
  ))
  emitActions(actions, nextId)
}

const updateCurrentPermissions = (permissions: ScopePermission[]) => {
  updateCurrentAction({
    permissions: toGrantScopePermissions(permissions),
  })
}

const createAction = () => {
  const exists = new Set(props.value.map((item) => item.id))
  const candidates = [
    { id: 'read', name: $t('AuthorizationTemplate.actionGroup.defaultRead') },
    { id: 'write', name: $t('AuthorizationTemplate.actionGroup.defaultWrite') },
    { id: 'manage', name: $t('AuthorizationTemplate.actionGroup.defaultManage') },
  ]
  const preset = candidates.find((item) => !exists.has(item.id))
  if (preset) {
    return { ...preset, description: '', permissions: [] }
  }
  const id = `action_${props.value.length + 1}`
  return { id, name: id, description: '', permissions: [] }
}

const addAction = () => {
  const action = createAction()
  emitActions([...props.value, action], action.id)
}

const removeAction = (index: number) => {
  if (props.value.length <= 1) {
    return
  }
  const actions = props.value.filter((_, itemIndex) => itemIndex !== index)
  const nextActive = actions[Math.max(index - 1, 0)]?.id || actions[0]?.id
  emitActions(actions, nextActive)
}
</script>

<style lang="less" scoped>
.authorization-action-editor {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 16px;
  min-height: 460px;
}

.authorization-action-editor__list,
.authorization-action-editor__detail {
  min-width: 0;
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  background: var(--bg);
}

.authorization-action-editor__list {
  padding: 10px;
}

.authorization-action-editor__list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  color: var(--ink-1);
  font-size: var(--fs-13);
  font-weight: 600;
}

.authorization-action-editor__item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 28px;
  gap: 8px;
  align-items: center;
  width: 100%;
  margin: 0 0 8px;
  padding: 8px;
  text-align: left;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 6px;
  cursor: pointer;

  &.is-active {
    background: var(--accent-soft);
    border-color: var(--jet-theme-primary, var(--accent));
  }
}

.authorization-action-editor__item-main {
  min-width: 0;

  b,
  small {
    display: block;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  b {
    color: var(--ink-1);
    font-size: var(--fs-13);
    line-height: 20px;
  }

  small {
    color: var(--ink-3);
    font-size: var(--fs-12);
    line-height: 18px;
  }
}

.authorization-action-editor__item-count {
  color: var(--ink-3);
  font-size: var(--fs-12);
  white-space: nowrap;
}

.authorization-action-editor__detail {
  padding: 16px;
}

.authorization-action-editor__detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;

  strong {
    display: block;
    color: var(--ink-1);
    font-size: var(--fs-15);
    line-height: 24px;
  }

  p {
    margin: 2px 0 0;
    color: var(--ink-3);
    font-size: var(--fs-12);
    line-height: 20px;
  }
}

@media (max-width: 900px) {
  .authorization-action-editor {
    grid-template-columns: 1fr;
    min-height: 0;
  }
}
</style>
