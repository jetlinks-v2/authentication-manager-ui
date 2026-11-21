import { useI18n } from 'vue-i18n'

export const useSpecActionLabel = () => {
  const { t, locale, getLocaleMessage } = useI18n()

  return (action: string) => {
    const key = `ApiGroupManagement.action.${action}`
    // 只读取当前语言词条，英文和未翻译的动作保留原始编码。
    return Object.prototype.hasOwnProperty.call(getLocaleMessage(locale.value), key) ? t(key) : action
  }
}
