<template>
  <section class="basis-section" :class="{ 'basis-section--plain': plain }">
    <header class="basis-section__header">
      <svg-icon v-if="icon" class="basis-section__icon" :type="icon" aria-hidden="true" />
      <h2 class="basis-section__title">{{ title }}</h2>
    </header>
    <div class="basis-section__body">
      <div class="basis-section__fields">
        <slot />
        <div v-if="$slots.extra" class="basis-section__action">
          <slot name="extra" />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * 基础配置页的分组：无背景无边框的「标题行（icon + 标题）＋ 内容行」。
 *
 * 内容行是按列分栏的行网格：每个字段把自己的 标签行 / 值行 放进同一列
 * （字段外层用 `display: contents`，因此字段成对占列），
 * `#extra` 插槽是行内最后一列，正好与字段的「值」同一行。
 * `plain` 用于自行排布内容的卡片（自定义域名），单列且不显示操作位。
 */
withDefaults(
  defineProps<{
    title: string
    /** `svg-icon` 的 type，例如 `authentication-manager-ui/system/basic-info`。 */
    icon?: string
    /** 内容自行排布时使用（单列、无操作列），适合向导类卡片。 */
    plain?: boolean
  }>(),
  {
    icon: '',
    plain: false,
  },
)
</script>

<style scoped lang="less">
.basis-section {
  margin-bottom: var(--space-5);
}

// 说明：core 全局样式里有 `header { justify-content: space-between }`，这里必须显式声明
// flex-start，否则标题会被推到最右侧。
.basis-section__header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.basis-section__title {
  min-width: 0;
  margin: 0;
  color: var(--jet-theme-text-title);
  font-size: var(--fs-18);
  font-weight: 600;
  line-height: var(--lh-snug);
}

.basis-section__icon {
  width: 1.5rem;
  height: 1.5rem;
  flex-shrink: 0;
}

/**
 * 内容区是带背景 / 边框 / 圆角 / 内边距的卡片；内部是行网格，
 * 字段按列排布（列号由字段自己的 `:column` 指定），操作位是最后一列，
 * 跨满所有行并拉伸，因此按钮相对整个内容面板垂直居中。
 */
.basis-section__body {
  padding: var(--space-3);
  border: var(--jet-theme-stroke-width) solid var(--jet-theme-border-secondary);
  border-radius: var(--r-3);
  background: var(--jet-theme-bg-container);
}

.basis-section__fields {
  display: grid;
  grid-template-columns: repeat(var(--basis-single-column, 3), minmax(0, 1fr)) auto;
  // auto 1fr：值行吃掉剩余高度，让网格总高等于内容高度，
  // 否则 1 / -1 只覆盖模板行，按钮会偏上而不是面板居中。
  grid-template-rows: auto 1fr;
  align-items: start;
  gap: var(--space-3);
}

.basis-section__fields > * {
  min-width: 0;
}

.basis-section__action {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  // 跨满所有行并拉伸，因此按钮相对整个内容面板垂直居中。
  grid-row: 1 / -1;
  align-self: stretch;
  white-space: nowrap;
}

// 字段组（如「展示备案号」+「备案号」）作为一个整体占一列并跨满所有行。
.basis-section__fields :deep(.basis-field-group) {
  display: grid;
  grid-row: 1 / -1;
  align-content: center;
  gap: var(--space-2);
}

// 自定义域名等自行排布的卡片：单列、无操作列。
.basis-section--plain .basis-section__fields {
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

@media (max-width: 64rem) {
  .basis-section__fields {
    --basis-single-column: 2;
  }
}

@media (max-width: 48rem) {
  .basis-section__fields {
    --basis-single-column: 1;
  }
}
</style>
