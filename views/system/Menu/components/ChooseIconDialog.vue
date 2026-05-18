<template>
    <a-modal
        open
        :title="$t('components.ChooseIconDialog.390527-0')"
        :width="800"
        @cancel="emits('close')"
        @ok="confirm"
    >
        <a-radio-group v-model:value="selected" class="radio">
            <a-radio-button
                v-for="typeStr in iconKeys"
                :value="typeStr"
                :key="typeStr"
                :class="{ active: selected === typeStr }"
            >
                <AIcon :type="typeStr" />
            </a-radio-button>
        </a-radio-group>
    </a-modal>
</template>

<script setup lang="ts">
import iconKeys from './fields';

const emits = defineEmits(['save', 'close']);

const confirm = () => {
    emits('save', selected.value);
};

const selected = ref<string>('');
</script>

<style lang="less" scoped>
.radio {
    display: grid;
    grid-gap: 1.25rem;
    grid-template-columns: repeat(6, 1fr);
    max-height: 31.25rem;
    overflow-y: auto;

    .ant-radio-button-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 6.25rem;
        font-size: var(--fs-40);
        border: 0.125rem solid #efefef;
        border-radius: 0.125rem;
        cursor: pointer;

        &.active {
            color: #415ed1;
            border-color: #415ed1;
        }
    }
}
</style>
