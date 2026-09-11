<template>
  <section class="resource-card rule-engine-card">
    <h3 class="resource-card-title">{{ t('packages.ProjectHome.group_rules') }}</h3>
    <div class="resource-card-content">
      <ResourceItem
        v-for="row in ruleRows"
        :key="row.id"
        :row="row"
        :show-icon="showIcon"
        :can-open="canOpen"
        @navigate="$emit('navigate', $event)"
      />
    </div>
  </section>
</template>

<script setup lang="ts" name="RuleEngineCard">
import { computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import ResourceItem from './ResourceItem.vue'
import type { HomeRow, HomeTarget } from '../../shared/types'

const props = defineProps({
  rows: { type: Array as PropType<HomeRow[]>, default: () => [] },
  showIcon: { type: Boolean, default: true },
  canOpen: { type: Function as PropType<(target?: HomeTarget) => boolean>, required: true },
})

defineEmits<{ navigate: [target?: HomeTarget] }>()

const { t } = useI18n()

const ruleRows = computed(() => props.rows.filter(r => r.group === 'intelligence' && r.subgroup === 'rules'))
</script>

<style scoped lang="less">
.resource-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  box-shadow: 0 1px 3px rgba(17, 24, 39, 0.04);
  height: 100%;
}

.resource-card-title {
  font-size: 18px;
  font-weight: 600;
  line-height: 24px;
  color: #1d2129;
  margin: 0 0 16px 0;
  padding: 0;
}

.resource-card-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  justify-content: flex-start;
}
</style>
