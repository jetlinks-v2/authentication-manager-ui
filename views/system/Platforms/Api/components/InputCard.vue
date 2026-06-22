<template>
    <span class="input-card-container" :class="props.value">
        {{ props.value?.toLocaleUpperCase() }}
    </span>
</template>

<script setup lang="ts">
const props = defineProps({
    value: String,
});
</script>

<style lang="less" scoped>
.input-card-container {
    padding: var(--space-1) var(--space-4);
    font-size: 14px;
    color: #fff;

    &.get {
        background-color: var(--jet-theme-primary);
    }
    &.put {
        background-color: #fa8c16;
    }
    &.post {
        background-color: var(--jet-theme-success);
    }
    &.delete {
        background-color: var(--jet-theme-error);
    }
    &.patch {
        background-color: #a0d911;
    }
}
</style>
