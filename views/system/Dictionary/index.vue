<template>
    <j-page-container>
        <FullPage>
            <EqualHeightColumns
                class="dictionary-layout"
                left-width="18.75rem"
                right-width="1fr"
            >
                <template #left>
                    <Left @selectData="selectData" />
                </template>
                <template #right>
                    <Right :data="data" />
                </template>
            </EqualHeightColumns>
        </FullPage>
    </j-page-container>
</template>

<script lang="ts" setup name="Dictionary">
import Left from './components/Left/index.vue'
import Right from './components/Right/index.vue'
const data = ref()
const selectData = (i: any) => {
    data.value = i
}
</script>
<style lang="less" scoped>
.dictionary-layout {
    background-color: #fff;
}
</style>
