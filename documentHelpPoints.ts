import i18n from '@jetlinks-web-core/locales'
import { registerDocumentHelpPoints } from '@jetlinks-web-core/utils/documentHelpRegistry'

export function registerAdministrationHelpPoints() {
  registerDocumentHelpPoints([
    ['system/Role', 'permissions.scope', 'rolePermissions', 'roles', 'authorization'],
    ['system/User', 'roles.application', 'applicationRoles', 'users', 'userEditor'],
    ['application-center/ApiApplication', 'permissions.operations', 'apiPermissions', 'apiApplications', 'authorization'],
    ['application-center/ThirdPartyApplication', 'credential.secret', 'credentialSecret', 'openPlatform', 'credentials'],
    ['application-center/ThirdPartyApplication', 'credential.tokenEndpoint', 'tokenEndpoint', 'openPlatform', 'credentials'],
    ['application-center/ThirdPartyApplication', 'authorization.resourceScope', 'resourceScope', 'openPlatform', 'authorization'],
    ['application-center/ThirdPartyApplication', 'subscription.events', 'subscriptionEvents', 'openPlatform', 'subscriptions'],
    ['application-center/ThirdPartyApplication', 'subscription.channel', 'subscriptionChannel', 'openPlatform', 'subscriptions'],
    ['application-center/ThirdPartyApplication', 'subscription.endpoint', 'callbackEndpoint', 'openPlatform', 'subscriptions'],
    ['application-center/Template', 'template.availability', 'templateAvailability', 'templates', 'templateDetails'],
    ['system/Log/Access', 'request.status', 'responseStatus', 'accessLogs', 'logDetails'],
    ['system/Log/Access', 'request.duration', 'requestDuration', 'accessLogs', 'logDetails'],
    ['system/Log/Access', 'request.trace', 'requestTrace', 'accessLogs', 'logDetails'],
    ['system/Log/System', 'log.service', 'logService', 'systemLogs', 'logDetails'],
    ['system/Log/System', 'log.context', 'logContext', 'systemLogs', 'logDetails'],
  ].map(([code, key, name, page, location]) => ({
    code, key,
    name: () => i18n.global.t(`AuthDocumentHelp.${name}`),
    page: () => i18n.global.t(`AuthDocumentHelp.${page}`),
    location: () => i18n.global.t(`AuthDocumentHelp.${location}`),
  })))
}
