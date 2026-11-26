<template>
  <PlatformSettingsEditor ref="editor" :mode="hideSubmitBtn ? 'form' : 'detail'" :save="save_api" />
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { PlatformSettingsEditor } from '@jetlinks-web-core/components/PlatformSettings'
import { save_api } from '@authentication-manager-ui/api/system/basis'
defineProps({ hideSubmitBtn: { type: Boolean, default: false } })
const editor = ref<InstanceType<typeof PlatformSettingsEditor>>()
defineExpose({ submit: () => editor.value?.submit() })
</script>
