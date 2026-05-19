<template>
    <j-page-container>
         <FullPage>
             <div class="dictionary_contain">
                 <div class="dictionary_left">
                     <Left @select-data="selectData"/>
                 </div>
                 <div class="dictionary_right">
                     <Right :groupId="groupId"/>
                 </div>
             </div>
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
 .dictionary_contain{
     display: flex;
     background-color: #fff;
     padding: 1.5rem;
     height: 100%;
 }
 .dictionary_left{
     border-right: 0.0625rem solid #f0f0f0;
     padding-right: 1.5rem;
     height:100%;
   width: 20rem;
 }
 .dictionary_right{
     flex:1 1 0;
      min-width: 0;
     height:100%
 }
 </style>
