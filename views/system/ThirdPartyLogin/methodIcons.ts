import wechatIcon from '@jetlinks-web-core/assets/login/weChat.png'
import dingtalkIcon from '@jetlinks-web-core/assets/login/dingding.png'
import wecomIcon from '@jetlinks-web-core/assets/notice/weixin-corp.png'
import oauth2Icon from '@jetlinks-web-core/assets/apply/third-party.png'
import type { LoginMethod } from './model'

export const methodIcons: Record<LoginMethod, string> = {
  wechat: wechatIcon,
  dingtalk: dingtalkIcon,
  wecom: wecomIcon,
  oauth2: oauth2Icon,
}
