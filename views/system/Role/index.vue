<template>
    <j-page-container>
        <FullPage transparentBackground>
            
                <EqualHeightColumns
                    class="role-layout"
                    left-width="18.75rem"
                    right-width="1fr"
                >
                    <template #left>
                        <Left :scope="scope" @select="scope = $event" />
                    </template>
                    <template #right>
                        <Right :scope="scope" />
                    </template>
                </EqualHeightColumns>
            
        </FullPage>
    </j-page-container>
</template>

 <script lang="ts" setup>
 import Left from './RoleLeft/index.vue'
 import Right from './RoleRight/index.vue'
 import { ref } from 'vue'
 import type { RoleScope } from './roleScope'

defineOptions({ name: 'Role' })
 const scope = ref<RoleScope>({ kind: 'global' })
 </script>
 <style lang="less" scoped>
 .role-layout {
  }
 </style>
