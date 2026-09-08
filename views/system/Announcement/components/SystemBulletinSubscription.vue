<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'
import { getAllNotice } from '@jetlinks-web-core/api/account/center'
import {
  changeSubscriptionState_api,
  getNoticeList_api,
  save_api,
} from '@jetlinks-web-core/api/account/notificationSubscription'
import { useSystemStore } from '@jetlinks-web-core/store'
import { SYSTEM_BULLETIN_CHANNEL, SYSTEM_BULLETIN_PROVIDER } from '../api'

interface BulletinChannel {
  id: string
  name: string
  provider: string
  channels?: Array<{
    id: string
    channelProvider: string
  }>
}

interface BulletinSubscription {
  id: string
  state?: string | { value?: string }
}

const { t } = useI18n()
const system = useSystemStore()
const loading = ref(false)
const saving = ref(false)
const loadFailed = ref(false)
const provider = ref<BulletinChannel>()
const subscription = ref<BulletinSubscription>()

const stateValue = computed(() => {
  const state = subscription.value?.state
  return typeof state === 'string' ? state : state?.value
})
const enabled = computed(() => stateValue.value === 'enabled')
const available = computed(() => !!provider.value?.channels?.some(channel => channel.channelProvider === SYSTEM_BULLETIN_CHANNEL))
const stateText = computed(() => {
  if (loadFailed.value) return t('Announcement.subscription.loadFailed')
  if (!available.value) return t('Announcement.subscription.unavailable')
  return t(enabled.value ? 'Announcement.subscription.enabled' : 'Announcement.subscription.disabled')
})

const assertSuccess = (response: { status?: number }) => {
  if (response.status !== 200) throw new Error('request failed')
}

/** 只查询系统公告 provider，避免普通通知订阅进入当前设置项。 */
const loadSubscription = async () => {
  loading.value = true
  loadFailed.value = false
  try {
    const [channelResponse, subscriptionResponse] = await Promise.all([
      getAllNotice(),
      getNoticeList_api({
        terms: [{ column: 'topicProvider', termType: 'eq', value: SYSTEM_BULLETIN_PROVIDER }],
      }),
    ])
    assertSuccess(channelResponse)
    assertSuccess(subscriptionResponse)
    provider.value = (channelResponse.result || []).find(
      (item: BulletinChannel) => item.provider === SYSTEM_BULLETIN_PROVIDER,
    )
    subscription.value = (subscriptionResponse.result?.data || []).find(
      (item: BulletinSubscription & { topicProvider?: string }) => item.topicProvider === SYSTEM_BULLETIN_PROVIDER,
    )
  } catch {
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}

/** 开启时创建或恢复订阅；关闭时仅停用实体并保留原渠道。 */
const changeEnabled = async (checked: boolean | string | number) => {
  if (saving.value) return
  const nextEnabled = checked === true
  saving.value = true
  try {
    if (subscription.value?.id) {
      const response = await changeSubscriptionState_api(subscription.value.id, nextEnabled ? 'enabled' : 'disabled')
      assertSuccess(response)
    } else if (nextEnabled && provider.value) {
      const channel = provider.value.channels?.find(item => item.channelProvider === SYSTEM_BULLETIN_CHANNEL)
      if (!channel) return
      const response = await save_api({
        subscribeName: provider.value.name,
        topicProvider: SYSTEM_BULLETIN_PROVIDER,
        providerId: provider.value.id,
        locale: system.language,
        notifyChannels: [channel.id],
      })
      assertSuccess(response)
    }
    await loadSubscription()
    onlyMessage(t(nextEnabled ? 'Announcement.subscription.enabledSuccess' : 'Announcement.subscription.disabledSuccess'))
  } catch {
    onlyMessage(t('Announcement.subscription.saveFailed'), 'error')
    await loadSubscription()
  } finally {
    saving.value = false
  }
}

onMounted(loadSubscription)
</script>

<template>
  <article class="bulletin-subscription">
    <div class="bulletin-subscription__icon">
      <AIcon type="NotificationOutlined" />
    </div>
    <div class="bulletin-subscription__content">
      <div class="bulletin-subscription__title">{{ t('Announcement.subscription.title') }}</div>
      <div class="bulletin-subscription__description">{{ t('Announcement.subscription.description') }}</div>
    </div>
    <div class="bulletin-subscription__state">
      <a-spin v-if="loading" size="small" />
      <template v-else>
        <span>{{ stateText }}</span>
        <a-button v-if="loadFailed" type="link" size="small" @click="loadSubscription">
          {{ t('Announcement.subscription.retry') }}
        </a-button>
        <a-switch
          v-else
          :checked="enabled"
          :disabled="!available || saving"
          :loading="saving"
          @change="changeEnabled"
        />
      </template>
    </div>
  </article>
</template>

<style scoped lang="less">
.bulletin-subscription {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 4.25rem;
}

.bulletin-subscription__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 2.5rem;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--r-2);
  background: var(--jet-theme-bg-hover);
  color: var(--jet-theme-primary);
}

.bulletin-subscription__content {
  flex: 1;
  min-width: 0;
}

.bulletin-subscription__title {
  color: var(--jet-theme-text);
  font-size: var(--fs-16);
  font-weight: 500;
}

.bulletin-subscription__description,
.bulletin-subscription__state span {
  color: var(--jet-theme-text-secondary);
  font-size: var(--fs-14);
}

.bulletin-subscription__state {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}
</style>
