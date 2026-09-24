import wechatIcon from '@jetlinks-web-core/assets/login/weChat.png'
import dingtalkIcon from '@jetlinks-web-core/assets/login/dingding.png'
import oauth2Icon from '@jetlinks-web-core/assets/apply/third-party.png'
import type { LoginMethod } from './model'

export const methodIcons: Record<LoginMethod, string> = {
  wechat: wechatIcon,
  dingtalk: dingtalkIcon,
  oauth2: oauth2Icon,
}
