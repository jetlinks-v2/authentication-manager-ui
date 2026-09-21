<template>
  <j-page-container>
    <FullPage transparent-background show-scroll>
      <main class="basis-page">
        <RegistryComponent page-code="system/basis" code="basic">
          <BasicForm key="basic" />
        </RegistryComponent>
      </main>
    </FullPage>
  </j-page-container>
</template>

<script setup name="Basis" lang="ts">
import BasicForm from './Form.vue'
</script>

<style scoped lang="less" src="./index.less"></style>
