<template>
  <j-page-container>
    <FullPage :fixed="false">
      <div style="padding: 1.5rem;">
          <BasicForm />
      </div>
    </FullPage>
  </j-page-container>
</template>

<script setup name="Basis" lang="ts">
import BasicForm from './Form.vue'
</script>
<style lang="less" scoped>

</style>
