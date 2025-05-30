<template>
    <a-modal
        :width="810"
        visible
        :title="$t('Save.Add.112184-0')"
        @cancel="emit('close')"
        @ok="onSave"
    >
        <ApplyList type="add" :options="typeOptions" v-model:value="type" />
    </a-modal>
</template>

<script lang="ts" setup>
import { queryType } from '@authentication-manager/api/system/apply';
import { useMenuStore } from '@/store/menu';
import { onlyMessage } from '@jetlinks-web/utils';
import ApplyList from './components/ApplyList/index.vue';
import { useI18n } from 'vue-i18n';

const { t: $t } = useI18n();
const emit = defineEmits(['close']);

const menuStory = useMenuStore();

const type = ref('');
const typeOptions = ref<any[]>([]);

const onSave = () => {
    if(type.value){
        menuStory.jumpPage('system/Apply/Save', {query: {provider: type.value}});
    } else {
        onlyMessage($t('Save.Add.112184-1'), 'error')
    }
};

onMounted(() => {
    queryType().then((resp: any) => {
        if (resp.status === 200) {
            const arr = resp.result.map((item: any) => ({
                label: item.name,
                value: item.provider,
            }));
            typeOptions.value = arr;
        }
    });
});
</script>

<style lang="less" scoped>
.type-warp {
    display: flex;
    flex-wrap: wrap;
    gap: 16px 24px;
    width: 100%;

    .type-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 172px;
        border: 1px solid #e0e4e8;
        border-radius: 2px;
        cursor: pointer;
        transition: all 0.3s;

        .type-item-title {
            margin-bottom: 8px;
            font-weight: 500;
            font-size: 14px;
        }

        .type-item-image {
            width: 106px;
            margin: 16px 33px;
        }

        &:hover {
            color: @primary-color-hover;
            opacity: 0.8;
        }

        &.active {
            border-color: @primary-color-active;
            opacity: 1;
        }
    }

    &.disabled {
        .notify-type-item {
            cursor: not-allowed;

            &:hover {
                color: initial;
                opacity: 0.6;
            }

            &.active {
                opacity: 1;
            }
        }
    }
}
</style>
