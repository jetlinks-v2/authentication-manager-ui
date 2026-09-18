<template>
  <CardBox
    class="application-card"
    :value="item.application"
    :status="item.application.status"
    :status-text="item.application.statusText"
    :status-names="STATUS_NAMES"
    :background-opacity="100"
    @click="emits('edit')"
  >
    <template #img>
      <CardAvatar :avatar="avatar" />
    </template>

    <template #content>
      <j-ellipsis class="application-card__name">
        <strong>{{ item.application.name }}</strong>
      </j-ellipsis>
      <j-ellipsis class="application-card__template">
        {{ item.template.name }}
      </j-ellipsis>
      <j-ellipsis class="application-card__description" :line-clamp="2">
        {{ description }}
      </j-ellipsis>
      <span class="application-card__created-at">
        <AIcon type="ClockCircleOutlined" />
        {{ $t('ProjectApplication.list.createdAt', { time: item.application.createdAt }) }}
      </span>
    </template>

    <template #bottom-tool>
      <div class="application-card__actions">
        <div class="application-card__links">
          <a-button type="text" @click="emits('edit')">
            <template #icon><AIcon type="EditOutlined" /></template>
            {{ $t('ProjectApplication.common.edit') }}
          </a-button>
          <a-button type="text" :loading="loading" @click="emits('toggle-status')">
            <template #icon>
              <AIcon :type="item.application.status === 'enabled' ? 'StopOutlined' : 'PlayCircleOutlined'" />
            </template>
            {{ statusActionText }}
          </a-button>
        </div>
        <a-button type="primary" :loading="opening" @click="emits('open')">
          {{ $t('ProjectApplication.detail.open') }}
        </a-button>
      </div>
    </template>
  </CardBox>
</template>

<script setup lang="ts" name="ProjectApplicationCard">
import { computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import CardBox from '@jetlinks-web-core/components/CardBox/index.vue'
import CardAvatar from '@jetlinks-web-core/components/CardBox/CardAvatar.vue'
import type { CardAvatarData } from '@jetlinks-web-core/components/CardBox/types'
import type { ApplicationTemplate, ProjectApplication } from '../types'

interface ApplicationCardItem {
  application: ProjectApplication
  template: ApplicationTemplate
}

const props = defineProps({
  item: {
    type: Object as PropType<ApplicationCardItem>,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  opening: {
    type: Boolean,
    default: false,
  },
})

const emits = defineEmits<{
  edit: []
  open: []
  'toggle-status': []
}>()
const { t: $t } = useI18n()

// 只有 enabled 需要绿色状态位；disabled 交给 BadgeStatus 回退为灰色。
const STATUS_NAMES: Record<string, string> = { enabled: 'success', disabled: 'default' }

const isImageIcon = (icon?: string) => !!icon && (/^(https?:|data:|\/)/.test(icon) || icon.includes('.'))

const avatar = computed<CardAvatarData>(() => {
  const icon = props.item.application.icon || props.item.template.icon
  const usesImage = isImageIcon(icon)
  return {
    src: usesImage ? icon : undefined,
    icon: icon && !usesImage ? icon : undefined,
    text: icon ? undefined : props.item.application.name.slice(0, 1),
    tone: 'info',
  }
})

const description = computed(() =>
  props.item.application.description || props.item.template.description || '--')

const statusActionText = computed(() => $t(props.item.application.status === 'enabled'
  ? 'ProjectApplication.common.disable'
  : 'ProjectApplication.common.enable'))
</script>

<style scoped lang="less">
.application-card {
  --panel-padding: var(--space-4);
  --card-shell-avatar-size: var(--space-10);

  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  /* 与 ProjectApplication/index.vue 内联「创建应用」卡片保持等高。 */
  min-height: var(--application-card-block-size, 14rem);
}

// 卡片整体点击进入详情：内容区撑满壳层，底栏固定在底部。
.application-card :deep(.card-warp) {
  display: flex;
  flex: 1;
  flex-direction: column;
}

// CardBox 自带的同名选择器层级更深，这里保持同等或更高的嵌套深度以稳定覆盖。
.application-card :deep(.card-warp .card-content) {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.application-card :deep(.card-warp .card-content-main) {
  flex: 1;
  align-items: stretch;
}

.application-card :deep(.card-warp .card-content .card-item-avatar) {
  align-items: flex-start;
}

.application-card :deep(.card-avatar) {
  border: 0;
  border-radius: var(--r-2);
}

// j-ellipsis 依赖自身的 display 声明做多行截断，这里只改排版，不覆盖 display。
.application-card__name {
  color: var(--ink-1);
  font-size: var(--fs-h4);
}

.application-card__template {
  margin-top: var(--space-1);
  color: var(--ink-3);
  font-size: var(--fs-meta);
}

.application-card__description {
  min-height: 2.75rem;
  margin-top: var(--space-3);
  color: var(--ink-2);
  font-size: var(--fs-body);
}

.application-card__created-at {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  margin-top: auto;
  padding-top: var(--space-3);
  color: var(--ink-3);
  font-size: var(--fs-meta);
  gap: var(--space-1);
}

// 底栏对齐 DeviceAlarmRecordCard：左侧图标文字按钮 + 右侧主按钮，中间用分隔线隔开。
.application-card__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--panel-padding);
  border-top: 1px solid var(--jet-theme-border-color-1);
  gap: var(--space-2);
}

.application-card__actions :deep(.ant-btn) {
  height: 2.5rem;
  font-size: var(--fs-14);
}

.application-card__links {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--space-1);
}

.application-card__links :deep(.ant-btn) {
  padding-inline: var(--space-2);
  color: var(--jet-theme-text-secondary);
}

.application-card__actions > :deep(.ant-btn-primary) {
  flex-shrink: 0;
  padding-inline: var(--space-5);
}

@media (max-width: 30rem) {
  .application-card__actions {
    flex-wrap: wrap;
  }

  .application-card__actions > :deep(.ant-btn-primary) {
    flex: 1 0 100%;
  }
}
</style>
