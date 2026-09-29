import type { AccountBindingApplication } from '../../api/accountBinding'

export const bindingMethods = ['wechat', 'dingtalk'] as const
export type BindingMethod = typeof bindingMethods[number]

const providers: Record<BindingMethod, string> = {
  wechat: 'wechat-official-account',
  dingtalk: 'dingtalk-ent-app',
}

/** 同一应用可能返回多个身份，行内计数按登录应用聚合。 */
export function groupAccountBindings(applications: AccountBindingApplication[]) {
  return bindingMethods.map(method => {
    const byId = new Map<string, AccountBindingApplication>()
    for (const application of applications) {
      if (application.provider !== providers[method]) continue
      if (!byId.has(application.id) || application.bound) {
        byId.set(application.id, application)
      }
    }
    const items = [...byId.values()]
    return { method, applications: items, boundCount: items.filter(item => item.bound).length }
  })
}
