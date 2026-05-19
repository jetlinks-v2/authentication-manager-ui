<template>
    <a-spin :spinning="loading">
        <div class="notify-type-warp">
            <div
                :key="item.id"
                v-for="item in options"
                class="notify-type-item"
                :class="{ active: notifyType === item.value }"
                @click="onSelect(item.value, item.label)"
            >
                <div class="notify-type-item-image">
                    <img :width="64" :src="item.iconUrl" />
                </div>
                <div class="notify-type-item-title">{{item.label}}</div>
            </div>
        </div>
    </a-spin>
</template>

<script lang="ts" setup>
import { queryChannelProviders } from '@authentication-manager-ui/api/system/noticeRule';
import { iconMap } from '../../../data';

const props = defineProps({
    value: {
        type: String,
        default: '',
    },
    name: {
        type: String,
        default: '',
    },
    disabled: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(['update:value', 'change', 'update:name']);

const loading = ref<boolean>(false);
const notifyType = ref('');
const options = ref<any[]>([]);

watch(
    () => props.value,
    (newVal) => {
        notifyType.value = newVal;
    },
    { deep: true, immediate: true },
);

const onSelect = (val: string, name: string) => {
    if (!props.disabled) {
        emit('update:value', val);
        emit('update:name', name);
        emit('change', {label: name, value: val});
    }
};

onMounted(() => {
    loading.value = true;
    queryChannelProviders().then((resp) => {
        if (resp.status === 200) {
            options.value = (resp.result as any[]).filter(i => i.id !== 'inside-mail').map((item) => {
                return {
                    label: item.name,
                    value: item.id,
                    iconUrl: iconMap.get(item.id),
                };
            });
            if(!props.value){
                emit('update:value', options.value?.[0]?.value);
                emit('update:name', options.value?.[0]?.label);
                emit('change', {label: options.value?.[0]?.label, value: options.value?.[0]?.value});
            }else{
                options.value.find((item:any)=>{
                    if(item.value === props.value){
                        emit('update:name',item.label)
                        return true
                    }
                })
            }
        }
        loading.value = false;
    });
});
</script>

<style lang="less" scoped>
.notify-type-warp {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  padding: 3.125rem 12.5rem;
  gap: 1rem 1.5rem;

  .notify-type-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    border-radius: 0.375rem;
    cursor: pointer;
    width: 6rem;
    padding: 0.5rem 1rem;

    .notify-type-item-title {
      font-size: 0.875rem;
      color: #333333;
      width: 100%;
      text-align: center;
    }

    .notify-type-item-image {
      width: 100%;
      margin-bottom: 0.5rem;
      display: flex;
      justify-content: center;
    }

    // &:hover {
    //   background-color: #F2F4F7;
    // }

    &.active {
      border: 0.0625rem solid #2F54EB;
    }
  }
}

</style>
