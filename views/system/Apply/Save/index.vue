<template>
    <j-page-container>
        <full-page :fixed="false">
            <EqualHeightColumns
                class="save-layout"
                left-width="18.75rem"
                right-width="1fr"
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
        </full-page>
    </j-page-container>
</template>

<script setup lang="ts">
import Does from './components/Does.vue';
import EditForm from './components/EditForm.vue';
import type { applyType } from './typing';

const rightType = ref<applyType>('internal-standalone');
const changeType = (newType: applyType) => {
    rightType.value = newType;
};
</script>

<style lang="less" scoped>
.save-layout__form {
    height: 100%;
}
</style>
