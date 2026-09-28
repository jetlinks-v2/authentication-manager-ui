<template>
    <j-page-container>
        <FullPage transparentBackground :fixed="false">
            
                <EqualHeightColumns
                    class="save-layout"
                    left-width="1fr"
                    right-width="18.75rem"
                >
                    <template #left>
                        <div class="save-layout__form">
                            <j-scrollbar>
                                <EditForm @change-apply-type="changeType" />
                            </j-scrollbar>
                        </div>
                    </template>
                    <template #right>
                        <Does :type="rightType" />
                    </template>
                </EqualHeightColumns>
            
        </FullPage>
    </j-page-container>
</template>

<script setup lang="ts">
import Does from './components/Does.vue';
import EditForm from './components/EditForm.vue';
import type { applyType } from './typing';

const rightType = ref<applyType>('third-party');
const changeType = (newType: applyType) => {
    rightType.value = newType;
};
</script>

<style lang="less" scoped>
.save-layout__form {
    height: 100%;
}
</style>
