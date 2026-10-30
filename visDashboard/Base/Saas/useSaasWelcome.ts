import { computed } from 'vue'
import { useNow } from '@vueuse/core'
import { useI18n } from 'vue-i18n'

/** 按浏览器本地时间划分问候时段，凌晨沿用晚间问候。 */
function greetingPeriod(hour: number) {
  if (hour >= 5 && hour < 9) return 'EarlyMorning'
  if (hour >= 9 && hour < 12) return 'Morning'
  if (hour >= 12 && hour < 14) return 'Noon'
  if (hour >= 14 && hour < 18) return 'Afternoon'
  return 'Evening'
}

/** 页面停留期间每分钟更新时间；复用 VueUse 时钟的作用域清理。 */
export function useSaasWelcome(name: () => string) {
  const { t } = useI18n()
  const now = useNow({ interval: 60_000 })
  return computed(() => {
    const greeting = t(`packages.ProjectHome.saasGreeting${greetingPeriod(now.value.getHours())}`)
    const userName = name()
    return userName ? t('packages.ProjectHome.saasWelcomeTimed', { greeting, name: userName }) : greeting
  })
}
