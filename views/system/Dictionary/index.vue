<template>
    <j-page-container>
        <FullPage>
            <div class="dictionary_contain">
                <div class="dictionary_left">
                    <Left @selectData="selectData" />
                </div>
                <div class="dictionary_right">
                    <Right :data="data" />
                </div>
            </div>
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
.dictionary_contain {
    padding: 1.5rem 1.5rem 0 1.5rem;
    height: 100%;
    display: flex;
}

.dictionary_left {
    border-right: 0.0625rem solid #f0f0f0;
    width: 20.25rem;
    height: 100%;
    padding-right: 0.75rem;
}

.dictionary_right {
    margin-left: 0.75rem;
    width: calc(100% - 20.25rem);
    height: 100%;
}
</style>
