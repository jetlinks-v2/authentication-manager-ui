<template>
  <a-card
    class="application-card"
    hoverable
    @click="emits('edit')"
  >
    <template #cover>
      <a-image
        class="application-card__cover"
        :src="cover"
        :fallback="defaultCover"
        :alt="item.application.name"
        :preview="false"
        width="100%"
      />
    </template>

    <div class="application-card__heading">
      <div class="application-card__name">
        <j-ellipsis>{{ item.application.name }}</j-ellipsis>
      </div>
      <a-tag class="application-card__type" :title="item.template.name">
        {{ applicationTypeText }}
      </a-tag>
      <TableActions class="application-card__more">
        <TableActionsItem>
          <a-button type="text" @click="emits('edit')">
            <template #icon><AIcon type="EditOutlined" /></template>
            {{ $t('ProjectApplication.common.edit') }}
          </a-button>
        </TableActionsItem>
        <TableActionsItem>
          <a-button type="text" :loading="loading" @click="emits('toggle-status')">
            <template #icon>
              <AIcon :type="item.application.status === 'enabled' ? 'StopOutlined' : 'PlayCircleOutlined'" />
            </template>
            {{ statusActionText }}
          </a-button>
        </TableActionsItem>
      </TableActions>
    </div>

    <div class="application-card__description">
      <j-ellipsis>{{ description }}</j-ellipsis>
    </div>

    <div class="application-card__footer" @click.stop>
      <j-badge-status
        :status="item.application.status"
        :text="item.application.statusText"
        :status-names="STATUS_NAMES"
      />
      <a-button class="application-card__open" :loading="opening" @click="emits('open')">
        {{ $t('ProjectApplication.list.open') }}
      </a-button>
    </div>
  </a-card>
</template>

<script setup lang="ts" name="ProjectApplicationCard">
import { computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import defaultCover from '@authentication-manager-ui/assets/application-cover.png'
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

// 列表封面来自模板基础图片，独立于应用和模板的图标。
const cover = computed(() => props.item.template.coverImage || defaultCover)

// 历史空类型沿用业务应用默认值；显式未知 provider 不推断类型。
const applicationTypeText = computed(() => {
  const provider = props.item.application.provider || 'official'
  if (provider === 'official') return $t('ProjectApplication.create.businessApplication')
  if (provider === 'third-party') return $t('ProjectApplication.create.thirdPartyApplication')
  return $t('comm.table.empty')
})

const description = computed(() =>
  props.item.application.description || props.item.template.description || $t('comm.table.empty'))

const statusActionText = computed(() => $t(props.item.application.status === 'enabled'
  ? 'ProjectApplication.common.disable'
  : 'ProjectApplication.common.enable'))
</script>

<style scoped lang="less">
.application-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  min-height: var(--application-card-block-size, 16rem);
  overflow: hidden;
  border-color: var(--card-shell-border);
  border-radius: var(--r-4);
  background: var(--bg);
  transition: var(--card-shell-transition);
}

.application-card:hover {
  border-color: var(--card-shell-border-hover);
  box-shadow: var(--card-shell-shadow-hover);
}

.application-card :deep(.ant-card-cover) {
  flex: none;
  margin: 0;
}

.application-card :deep(.ant-card-cover .ant-image) {
  display: block;
  aspect-ratio: 2.1;
  overflow: hidden;
  background: var(--bg-sunken);
}

.application-card :deep(.application-card__cover) {
  display: block;
  height: 100%;
  object-fit: cover;
}

.application-card :deep(.ant-card-body) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  padding: var(--space-4) var(--space-5);
}

.application-card__heading {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--space-2);
}

.application-card__name {
  flex: 0 1 auto;
  min-width: 0;
  color: var(--ink-1);
  font-size: var(--fs-18);
  font-weight: 600;
  line-height: 1.5;
}

.application-card__name :deep(.j-ellipsis) {
  font: inherit;
}

.application-card__type {
  flex-shrink: 0;
  margin-inline-end: 0;
  padding: 0 var(--space-2);
  border: 0;
  border-radius: var(--r-2);
  background: var(--bg-sunken);
  color: var(--ink-3);
  font-size: var(--fs-meta);
  line-height: 1.8;
}

.application-card__more {
  flex: none;
  margin-left: auto;
  color: var(--ink-2);
}

.application-card__more :deep(.table-actions__trigger .anticon) {
  transform: rotate(90deg);
}

.application-card__description {
  margin-top: var(--space-2);
  color: var(--ink-3);
  font-size: var(--fs-body);
  line-height: 1.5;
}

.application-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: var(--space-4);
  gap: var(--space-3);
  cursor: default;
}

.application-card__open {
  flex-shrink: 0;
  height: var(--space-9);
  padding-inline: var(--space-5);
  border-color: var(--card-shell-border);
  border-radius: var(--r-3);
  color: var(--ink-1);
  font-size: var(--fs-body);
}

.application-card__footer :deep(.j-badge-status.success .ant-badge-status-text) {
  color: var(--card-tone-success);
}
</style>
