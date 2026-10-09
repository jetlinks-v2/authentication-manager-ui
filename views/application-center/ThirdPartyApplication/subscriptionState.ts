import type { ApplicationSubscription } from '@authentication-manager-ui/api/application-center/applicationSubscription'
const colors: Record<ApplicationSubscription['executionState'], string> = {
  notRunning: 'default', starting: 'processing', running: 'success', failed: 'error',
}
export const executionColor = (state?: string) => state && Object.prototype.hasOwnProperty.call(colors, state)
  ? colors[state as ApplicationSubscription['executionState']] : 'default'
export const executionStateKey = (state?: string) => 'ThirdPartyApplication.subscription.execution.' +
  (state && Object.prototype.hasOwnProperty.call(colors, state) ? state : 'unknown')
