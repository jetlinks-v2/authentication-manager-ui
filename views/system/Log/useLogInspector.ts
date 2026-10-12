import { ref, shallowRef } from 'vue';
import { onKeyStroke, useEventListener } from '@vueuse/core';

/** 日志行与标题共用选择入口，无掩码详情允许连续切换，不发起额外请求。 */
export const useLogInspector = <T extends { id?: string }>(rowClass: string, detailClass: string) => {
    const open = ref(false);
    const selected = shallowRef<T>();
    const selectRecord = (record: T) => {
        selected.value = record;
        open.value = true;
    };
    const handleRecordClick = (record: T, event: MouseEvent | KeyboardEvent) => {
        const selection = event.view?.getSelection();
        // 拖选结束也会触发 click；键盘查看则不受残留文本选择影响。
        if (event.detail !== 0 && selection && !selection.isCollapsed && selection.toString()) return;
        selectRecord(record);
    };
    const customRow = (record: T) => ({ onClick: (event: MouseEvent) => handleRecordClick(record, event) });
    const rowClassName = (record: T) => open.value && selected.value
        && (selected.value === record || (record.id && record.id === selected.value.id))
        ? `${rowClass} ant-table-row-selected` : rowClass;

    // 无掩码抽屉不抢背景焦点，Escape 与行外点击均关闭当前详情。
    onKeyStroke('Escape', () => { open.value = false; });
    useEventListener('click', (event: MouseEvent) => {
        const target = event.target;
        if (open.value && target instanceof Element
            && !target.closest(`.${rowClass}, .${detailClass}`)) open.value = false;
    });
    return { open, selected, selectRecord, handleRecordClick, customRow, rowClassName };
};
