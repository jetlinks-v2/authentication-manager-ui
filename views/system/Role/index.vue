<template>
    <j-page-container>
         <FullPage transparentBackground>
             <EqualHeightColumns
                 class="role-layout"
                 left-width="18.75rem"
                 right-width="1fr"
             >
                 <template #left>
                  <ContentPanel>
                    <Left @select-data="selectData"/>
                  </ContentPanel>
                 </template>
                 <template #right>
                   <Right :groupId="groupId"/>
                 </template>
             </EqualHeightColumns>
         </FullPage>
    </j-page-container>
 </template>

 <script lang="ts" setup name="Role">
 import Left from './RoleLeft/index.vue'
 import Right from './RoleRight/index.vue'
 const groupId = ref()
 const selectData = (data:any)=>{
    groupId.value = data[0]
 }
 </script>
 <style lang="less" scoped>
 .role-layout {
  }
 </style>
