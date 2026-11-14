<template>
    <j-page-container>
        <Api :mode="'appManger'" hasHome :code="code" />
    </j-page-container>
</template>

<script setup lang="ts">
import Api from '../../Platforms/Api/index.vue';

defineOptions({ name: 'apiPage' })
const route = useRoute()
const code = route.query.code as string
</script>

<style scoped></style>
