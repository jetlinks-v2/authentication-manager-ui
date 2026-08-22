<template>
  <div class="template-selector">
    <div
      v-for="item in templates"
      :key="item.id"
      class="template-card"
      :class="{ selected: modelValue === item.id, disabled: item.disabled }"
      role="button"
      :tabindex="item.disabled ? -1 : 0"
      :aria-disabled="item.disabled"
      @click="selectTemplate(item)"
      @keydown.enter="selectTemplate(item)"
      @keydown.space.prevent="selectTemplate(item)"
    >
      <span class="template-icon">
        <img v-if="isImageIcon(item.icon)" :src="item.icon" :alt="item.name" />
        <AIcon v-else :type="item.icon || 'AppstoreOutlined'" />
      </span>
      <span class="template-copy">
        <strong>{{ item.name }}</strong>
        <span>{{ item.description || '--' }}</span>
      </span>
      <a-button
        v-if="!item.disabled"
        type="link"
        size="small"
        class="detail-link"
        @click.prevent.stop="openPreview(item)"
      >
        {{ $t('ProjectApplication.template.detail') }}
        <AIcon type="RightOutlined" />
      </a-button>
      <a-tooltip v-else :title="$t('ProjectApplication.template.unavailable')">
        <span class="unavailable" :aria-label="$t('ProjectApplication.template.unavailable')">
          <AIcon type="LockOutlined" />
        </span>
      </a-tooltip>
      <AIcon
        v-if="modelValue === item.id"
        class="selected-indicator"
        type="CheckCircleFilled"
      />
    </div>

    <a-modal
      :open="!!previewTemplate"
      :title="previewTemplate?.name || ''"
      :footer="null"
      @cancel="previewTemplate = undefined"
    >
      <div v-if="previewTemplate" class="template-preview">
        <span class="preview-icon">
          <img v-if="isImageIcon(previewTemplate.icon)" :src="previewTemplate.icon" :alt="previewTemplate.name" />
          <AIcon v-else :type="previewTemplate.icon || 'AppstoreOutlined'" />
        </span>
        <div class="preview-copy">
          <p>{{ previewTemplate.description || '--' }}</p>
          <a-spin :spinning="menusLoading">
            <div v-if="previewMenus.length" class="preview-menus">
              <a-tag v-for="menu in previewMenus" :key="menu">{{ menu }}</a-tag>
            </div>
            <span v-else-if="!menusLoading" class="preview-empty">{{ $t('ProjectApplication.template.noMenus') }}</span>
          </a-spin>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts" name="ProjectApplicationTemplateSelector">
import type { PropType } from 'vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ApplicationTemplate } from '../types'
import { useProjectApplication } from '../useProjectApplication'

const props = defineProps({
  templates: {
    type: Array as PropType<ApplicationTemplate[]>,
    default: () => [],
  },
  modelValue: {
    type: String,
    default: '',
  },
})

const emits = defineEmits(['update:modelValue'])
const { t: $t } = useI18n()
const store = useProjectApplication()
const previewTemplate = ref<ApplicationTemplate>()
const previewMenus = ref<string[]>([])
const menusLoading = ref(false)

const selectTemplate = (item: ApplicationTemplate) => {
  if (!item.disabled) emits('update:modelValue', item.id)
}

const isImageIcon = (icon?: string) => !!icon && (/^(https?:|data:|\/)/.test(icon) || icon.includes('.'))

const openPreview = async (item: ApplicationTemplate) => {
  previewTemplate.value = item
  previewMenus.value = []
  menusLoading.value = true
  try {
    previewMenus.value = await store.loadTemplateMenus(item.id)
  } catch {
    previewMenus.value = []
  } finally {
    menusLoading.value = false
  }
}
</script>

<style scoped>
.template-selector {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
}

.template-card {
  position: relative;
  display: grid;
  min-height: 7rem;
  grid-template-columns: 2rem minmax(0, 1fr);
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--line);
  border-radius: var(--r-3);
  background: var(--bg);
  color: var(--ink-1);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.template-card:hover,
.template-card.selected {
  border-color: var(--accent);
}

.template-card.selected {
  background: var(--accent-soft);
  box-shadow: var(--ring-focus);
}

.template-card.disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.template-icon,
.preview-icon {
  display: grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  border-radius: var(--r-2);
  background: var(--accent-soft);
  color: var(--accent);
  font-size: var(--fs-16);
}

.template-icon img,
.preview-icon img { width: 100%; height: 100%; object-fit: cover; }

.template-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--space-1);
}

.template-copy strong { font-size: var(--fs-14); }
.template-copy span {
  display: -webkit-box;
  overflow: hidden;
  color: var(--ink-3);
  font-size: var(--fs-12);
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.detail-link,
.unavailable {
  position: absolute;
  right: var(--space-3);
  bottom: var(--space-1);
  font-size: var(--fs-12);
}

.unavailable { color: var(--ink-4); }
.selected-indicator {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  color: var(--accent);
}

.template-preview {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  color: var(--ink-2);
  line-height: 1.7;
}

.template-preview p { margin: 0; }
.preview-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: var(--space-3); }
.preview-menus { display: flex; flex-wrap: wrap; gap: var(--space-1); }
.preview-empty { color: var(--ink-4); font-size: var(--fs-12); }

@media (max-width: 40rem) {
  .template-selector { grid-template-columns: 1fr; }
}
</style>
