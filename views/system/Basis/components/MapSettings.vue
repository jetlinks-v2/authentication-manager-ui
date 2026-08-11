<template>
  <a-form-item name="webKey">
    <template #label>
      <a-space>
        <span>{{ $t('Basis.Form.436809-3') }}</span>
        <a-tooltip :title="$t('Basis.Form.436809-4')">
          <AIcon type="QuestionCircleOutlined" />
        </a-tooltip>
      </a-space>
    </template>
    <a-input v-model:value="webKeyModel" :placeholder="$t('Basis.Form.436809-5')" />
  </a-form-item>
  <a-form-item name="apiKey">
    <template #label>
      <a-space>
        <span>{{ $t('Basis.Form.436809-6') }}</span>
        <a-tooltip :title="$t('Basis.Form.436809-7')">
          <AIcon type="QuestionCircleOutlined" />
        </a-tooltip>
      </a-space>
    </template>
    <a-input v-model:value="apiKeyModel" :placeholder="$t('Basis.Form.436809-8')" />
  </a-form-item>
  <a-form-item>
    <template #label>
      <a-space>
        <span>{{ $t('Basis.Form.436809-9') }}</span>
        <a-tooltip :title="$t('Basis.Form.436809-10')">
          <AIcon type="QuestionCircleOutlined" />
        </a-tooltip>
      </a-space>
    </template>
    <a-input v-model:value="secretKeyModel" :placeholder="$t('Basis.Form.436809-11')" />
  </a-form-item>
  <a-form-item name="base-path">
    <template #label>
      <a-space>
        <span>base-path</span>
        <a-tooltip>
          <template #title>
            <div class="base-path-description">
              <div>{{ $t('Basis.Form.436809-12') }}</div>
              <div>
                {{ $t('Basis.Form.436809-13') }}{http/https}:
                //{前端所在服务器IP地址}:{前端暴露的服务端口}/api
              </div>
            </div>
          </template>
          <AIcon type="QuestionCircleOutlined" />
        </a-tooltip>
      </a-space>
    </template>
    <a-input v-model:value="basePathModel" :placeholder="$t('Basis.Form.436809-14')" />
  </a-form-item>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  webKey: String,
  apiKey: String,
  secretKey: String,
  basePath: String
})

const emit = defineEmits([
  'update:webKey',
  'update:apiKey',
  'update:secretKey',
  'update:basePath'
])
const { t: $t } = useI18n()

const webKeyModel = computed({
  get: () => props.webKey,
  set: value => emit('update:webKey', value)
})
const apiKeyModel = computed({
  get: () => props.apiKey,
  set: value => emit('update:apiKey', value)
})
const secretKeyModel = computed({
  get: () => props.secretKey,
  set: value => emit('update:secretKey', value)
})
const basePathModel = computed({
  get: () => props.basePath,
  set: value => emit('update:basePath', value)
})
</script>

<style scoped>
.base-path-description {
  word-break: break-all;
}
</style>
