<template>
  <div class="authorization-template-item">
    <div class="authorization-template-item__status">
      <j-badge-status
        :status="stateValue"
        :text="stateText"
        :statusNames="stateStatusNames"
      />
      <span class="authorization-template-item__risk">{{ riskText }}</span>
    </div>

    <div class="authorization-template-item__main">
      <div class="authorization-template-item__title-row">
        <div class="authorization-template-item__icon">
          <AIcon type="SafetyCertificateOutlined" />
        </div>
        <div class="authorization-template-item__title-block">
          <j-ellipsis class="authorization-template-item__title">
            {{ data.name || data.id || '--' }}
          </j-ellipsis>
          <div class="authorization-template-item__tags">
            <a-tag>{{ sceneText }}</a-tag>
            <a-tag>{{ typeText }}</a-tag>
            <a-tag>{{ data.id }}</a-tag>
          </div>
        </div>
      </div>
      <j-ellipsis class="authorization-template-item__desc">
        {{ data.description || $t('AuthorizationTemplate.text.noDescription') }}
      </j-ellipsis>
    </div>

    <div class="authorization-template-item__meta">
      <div class="authorization-template-item__meta-block">
        <span>{{ $t('AuthorizationTemplate.field.scope') }}</span>
        <strong>{{ permissionCount }}</strong>
      </div>
      <div class="authorization-template-item__meta-block">
        <span>{{ $t('AuthorizationTemplate.field.version') }}</span>
        <strong>{{ data.version ?? '--' }}</strong>
      </div>
      <div class="authorization-template-item__meta-block authorization-template-item__meta-block--time">
        <span>{{ $t('AuthorizationTemplate.field.modifyTime') }}</span>
        <strong>{{ modifyTimeText }}</strong>
      </div>
    </div>

    <div class="authorization-template-item__actions">
      <template
        v-for="action in actions"
        :key="action.key"
      >
        <j-permission-button
          type="text"
          size="small"
          :danger="action.key === 'delete'"
          :hasPermission="action.hasPermission"
          :popConfirm="action.popConfirm"
          @click="(event) => action.onClick?.(data, event)"
        >
          <AIcon :type="action.icon" />
          <span>{{ action.text }}</span>
        </j-permission-button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import type { PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AuthorizationTemplateItem } from '../typings'
import {
  getEnumValue,
  getOptionLabel,
  getScopePermissionCount,
  riskLevelOptions,
  sceneOptions,
  stateOptions,
  stateStatusNames,
  typeOptions,
} from '../util'

const { t: $t } = useI18n()

const props = defineProps({
  data: {
    type: Object as PropType<AuthorizationTemplateItem>,
    required: true,
  },
  actions: {
    type: Array as PropType<Record<string, any>[]>,
    default: () => [],
  },
})

const sceneText = computed(() => getOptionLabel(sceneOptions, props.data.scene))
const typeText = computed(() => getOptionLabel(typeOptions, props.data.type))
const riskText = computed(() => getOptionLabel(riskLevelOptions, props.data.riskLevel))
const stateValue = computed(() => getEnumValue(props.data.state) || 'default')
const stateText = computed(() => getOptionLabel(stateOptions, props.data.state))
const permissionCount = computed(() => getScopePermissionCount(props.data))
const modifyTimeText = computed(() => (
  props.data.modifyTime ? dayjs(props.data.modifyTime).format('YYYY-MM-DD HH:mm') : '--'
))
</script>

<style lang="less" scoped src="./TemplateCard.less"></style>
