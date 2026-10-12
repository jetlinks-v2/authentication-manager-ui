import { computed, ref, watch, type Ref } from 'vue';
import { useWindowSize } from '@vueuse/core';

/** 两类日志详情保留桌面列表操作区，切换或重开记录时重置展开与滚动。 */
export const useLogDetailState = (record: Ref<unknown>, open: Ref<boolean>, initialExpandedKeys: string[] = []) => {
    const expandedKeys = ref<string[]>([...initialExpandedKeys]);
    const contentVersion = ref(0);
    const { width } = useWindowSize();
    const drawerWidth = computed(() => width.value >= 768 ? Math.min(560, width.value / 2) : width.value - 32);
    watch([record, open], () => {
        contentVersion.value += 1;
        expandedKeys.value = [...initialExpandedKeys];
    }, { flush: 'sync' });
    return { expandedKeys, contentVersion, drawerWidth };
};
