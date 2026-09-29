<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { QRCode } from 'ant-design-vue'
import { useAccountBinding } from './useAccountBinding'

const { t } = useI18n()
const {
  groups, choices, loading, loadFailed, selectedMethod, selectedApplication,
  authorizationUrl, bindingState, bindingError, load, open, bind, back, close,
} = useAccountBinding()
</script>

<template>
  <div v-for="group in groups" :key="group.method" class="account-binding-row">
    <dt>{{ t(`AccountBinding.${group.method}`) }}</dt>
    <dd>
      <a-spin v-if="loading" size="small" />
      <a-button v-else-if="loadFailed" type="link" size="small" @click="load">
        {{ t('AccountBinding.retryLoad') }}
      </a-button>
      <template v-else>
        <span v-if="!group.applications.length">{{ t('AccountBinding.unconfigured') }}</span>
        <template v-else>
          <span v-if="group.applications.length > 1">
            {{ t('AccountBinding.count', { bound: group.boundCount, total: group.applications.length }) }}
          </span>
          <span v-else>{{ t(group.boundCount ? 'AccountBinding.bound' : 'AccountBinding.unbound') }}</span>
          <a-button
            v-if="group.boundCount < group.applications.length"
            type="link" size="small"
            :aria-label="t(`AccountBinding.${group.method}`)"
            @click="open(group.method)"
          >{{ t('AccountBinding.bind') }}</a-button>
        </template>
      </template>
    </dd>
  </div>

  <a-modal
    :open="!!selectedMethod"
    :title="selectedMethod ? t(`AccountBinding.${selectedMethod}`) : ''"
    :footer="null" :width="440" destroy-on-close
    @cancel="close"
  >
    <template v-if="selectedApplication">
      <div class="binding-application-name">{{ selectedApplication.name }}</div>
      <div class="binding-authorization">
        <a-spin v-if="bindingState === 'loading' || bindingState === 'checking'" />
        <template v-else-if="bindingState === 'active'">
          <QRCode v-if="selectedMethod === 'wechat'" :value="authorizationUrl" :size="240" />
          <iframe v-else :src="authorizationUrl" :title="t('AccountBinding.dingtalk')" class="binding-frame" />
          <p>{{ t('AccountBinding.scanDescription') }}</p>
        </template>
        <template v-else>
          <a-alert
            :type="bindingState === 'expired' ? 'warning' : 'error'" show-icon
            :message="bindingState === 'expired' ? t('AccountBinding.expired') : bindingError"
          />
          <a-button @click="bind(selectedApplication)">{{ t('AccountBinding.retry') }}</a-button>
        </template>
      </div>
      <a-button v-if="choices.length > 1" type="link" @click="back">{{ t('AccountBinding.back') }}</a-button>
    </template>
    <template v-else>
      <p>{{ t('AccountBinding.chooseApplication') }}</p>
      <div v-for="application in choices" :key="application.id" class="binding-choice">
        <span>{{ application.name }}</span>
        <span v-if="application.bound">{{ t('AccountBinding.bound') }}</span>
        <a-button v-else type="link" @click="bind(application)">{{ t('AccountBinding.bind') }}</a-button>
      </div>
    </template>
  </a-modal>
</template>

<style scoped lang="less">
.account-binding-row {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f3f6fa;
  font-size: var(--fs-14);
  line-height: 1.25rem;

  dt { flex-shrink: 0; color: #4e5969; }
  dd { display: flex; align-items: center; justify-content: flex-end; gap: 0.25rem; margin: 0; }
  :deep(.ant-btn) { height: auto; padding: 0; line-height: inherit; }
}
.binding-application-name { margin-bottom: 1rem; font-weight: 500; }
.binding-authorization {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 16rem;
  gap: 1rem;

  p { color: var(--jet-theme-text-secondary); }
}
.binding-frame { width: 100%; height: 26.25rem; border: 0; }
.binding-choice {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--jet-theme-border);
}
</style>
