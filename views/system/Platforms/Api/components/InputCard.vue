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
    padding: 0.25rem 0.9375rem;
    font-size: 0.875rem;
    color: #fff;

    &.get {
        background-color: #1890ff;
    }
    &.put {
        background-color: #fa8c16;
    }
    &.post {
        background-color: #52c41a;
    }
    &.delete {
        background-color: #f5222d;
    }
    &.patch {
        background-color: #a0d911;
    }
}
</style>
