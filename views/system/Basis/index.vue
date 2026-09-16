<template>
  <j-page-container>
    <FullPage transparent-background show-scroll>
      <main class="basis-page">
        <BasicForm />
        <TenantDomainSection />
      </main>
    </FullPage>
  </j-page-container>
</template>

<script setup name="Basis" lang="ts">
import BasicForm from './Form.vue'
import TenantDomainSection from './components/TenantDomainSection.vue'
</script>

<style scoped lang="less" src="./index.less"></style>