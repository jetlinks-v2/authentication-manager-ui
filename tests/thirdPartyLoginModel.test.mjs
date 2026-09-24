import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDraft,
  filterConfigs,
  fromApplication,
  identifierOf,
  isSupportedApplication,
  loginMethods,
  toApplicationPayload,
} from '../views/system/ThirdPartyLogin/model.ts'

test('only exposes login methods backed by existing providers', () => {
  assert.deepEqual(loginMethods, ['wechat', 'dingtalk', 'oauth2'])
  const draft = createDraft('wechat')
  assert.equal(draft.name, '')
  assert.equal(draft.logoUrl, '')
  assert.equal(draft.enabled, false)
  assert.equal(draft.showOnLogin, true)
  assert.equal(draft.autoCreateUser, false)
  assert.equal(draft.usernamePrefix, '')
  assert.deepEqual(draft.roleIdList, [])
  assert.deepEqual(draft.orgIdList, [])
  assert.equal('syncOrganization' in draft, false)
})

test('method-specific identifiers use backend fields', () => {
  assert.equal(identifierOf({ ...createDraft('wechat'), appId: 'wx-1' }), 'wx-1')
  assert.equal(identifierOf({ ...createDraft('dingtalk'), appKey: 'ding-1' }), 'ding-1')
  assert.equal(identifierOf({ ...createDraft('oauth2'), clientId: 'client-1' }), 'client-1')
})

test('type and text filters search names and identifiers', () => {
  const wechat = { ...createDraft('wechat'), id: '1', name: '官方', appId: 'wx-1', createdAt: 'now' }
  const oauth = { ...createDraft('oauth2'), id: '2', name: '外部身份源', clientId: 'client-2', createdAt: 'now' }
  assert.deepEqual(filterConfigs([wechat, oauth], 'wechat', '').map(item => item.id), ['1'])
  assert.deepEqual(filterConfigs([wechat, oauth], 'all', 'CLIENT-2').map(item => item.id), ['2'])
  assert.deepEqual(filterConfigs([wechat, oauth], 'oauth2', '微信'), [])
  assert.deepEqual(filterConfigs([wechat, oauth], 'all', [{ column: 'keyword', termType: 'like', value: 'CLIENT-2' }]).map(item => item.id), ['2'])
  assert.deepEqual(filterConfigs([wechat, oauth], 'all', [
    { value: '外部' },
    { value: 'client-2', type: 'and' },
  ]).map(item => item.id), ['2'])
  assert.deepEqual(filterConfigs([wechat, oauth], 'all', [
    { value: 'wx-1' },
    { value: 'client-2', type: 'or' },
  ]).map(item => item.id), ['1', '2'])
})

test('filters applications by provider and OAuth2 type without hiding disabled login entries', () => {
  const base = { id: '1', name: 'app', integrationModes: [{ value: 'ssoClient', text: 'SSO' }] }
  assert.equal(isSupportedApplication({ ...base, provider: 'wechat-official-account' }), true)
  assert.equal(isSupportedApplication({ ...base, provider: 'wechat-webapp' }), false)
  assert.equal(isSupportedApplication({ ...base, provider: 'wechat-miniapp' }), false)
  assert.equal(isSupportedApplication({ ...base, provider: 'dingtalk-ent-app' }), true)
  assert.equal(isSupportedApplication({ ...base, provider: 'wecom' }), false)
  assert.equal(isSupportedApplication({ ...base, provider: 'wechat-official-account', integrationModes: ['page'] }), true)
  assert.equal(isSupportedApplication({
    ...base,
    provider: 'third-party',
    sso: { configuration: { type: 'oauth2' } },
  }), true)
  assert.equal(isSupportedApplication({
    ...base,
    provider: 'third-party',
    sso: { configuration: { type: 'bearer' } },
  }), false)
})

test('maps supported login providers to page records without list secrets', () => {
  const cases = [
    ['wechat-official-account', 'wechat'],
    ['dingtalk-ent-app', 'dingtalk'],
    ['third-party', 'oauth2'],
  ]

  for (const [provider, method] of cases) {
    const record = fromApplication({
      id: provider,
      name: provider,
      provider,
      logoUrl: 'https://example.com/icon.png',
      state: { value: 'enabled' },
      integrationModes: ['ssoClient'],
      sso: {
        autoCreateUser: true,
        usernamePrefix: 'external-',
        roleIdList: ['role-1'],
        orgIdList: ['org-1'],
        configuration: {
          type: provider === 'third-party' ? 'oauth2' : undefined,
          appSecret: 'secret',
          oauth2: { clientSecret: 'oauth-secret' },
        },
      },
    })
    assert.equal(record?.method, method)
    assert.equal(record?.logoUrl, 'https://example.com/icon.png')
    assert.equal(record?.enabled, true)
    assert.equal(record?.showOnLogin, true)
    assert.equal(record?.autoCreateUser, true)
    assert.equal(record?.usernamePrefix, 'external-')
    assert.deepEqual(record?.roleIdList, ['role-1'])
    assert.deepEqual(record?.orgIdList, ['org-1'])
    assert.equal(record?.secret, '')
  }
})

test('keeps login entry visibility independent from application enabled state', () => {
  const application = {
    id: 'wechat-login',
    name: '微信公众号',
    provider: 'wechat-official-account',
    state: { value: 'enabled' },
    integrationModes: [{ value: 'page' }],
    sso: { configuration: { appId: 'wx-id' } },
  }

  const record = fromApplication(application)
  assert.equal(record?.enabled, true)
  assert.equal(record?.showOnLogin, false)

  const visible = toApplicationPayload({ ...record, showOnLogin: true }, application)
  assert.equal(visible.state, 'enabled')
  assert.deepEqual(visible.integrationModes, ['page', 'ssoClient'])

  const hidden = toApplicationPayload({ ...record, showOnLogin: false }, {
    ...application,
    integrationModes: visible.integrationModes,
  })
  assert.equal(hidden.state, 'enabled')
  assert.deepEqual(hidden.integrationModes, ['page'])
})

test('builds existing application payloads without prototype-only fields', () => {
  const wechat = toApplicationPayload({
    ...createDraft('wechat'),
    name: '公众号登录',
    logoUrl: 'https://example.com/wechat.png',
    appId: 'wx-id',
    secret: 'wx-secret',
    showOnLogin: true,
    autoCreateUser: true,
    usernamePrefix: 'wechat-',
    roleIdList: ['role-1'],
    orgIdList: ['org-1'],
  })
  assert.equal(wechat.provider, 'wechat-official-account')
  assert.equal(wechat.logoUrl, 'https://example.com/wechat.png')
  assert.deepEqual(wechat.integrationModes, ['ssoClient'])
  assert.equal(wechat.sso.configuration.appId, 'wx-id')
  assert.equal(wechat.sso.configuration.appSecret, 'wx-secret')
  assert.equal(wechat.sso.autoCreateUser, true)
  assert.equal(wechat.sso.usernamePrefix, 'wechat-')
  assert.deepEqual(wechat.sso.roleIdList, ['role-1'])
  assert.deepEqual(wechat.sso.orgIdList, ['org-1'])
  assert.equal('defaultPasswd' in wechat.sso, false)

  const dingTalk = toApplicationPayload({
    ...createDraft('dingtalk'),
    name: '钉钉登录',
    appKey: 'ding-key',
    secret: 'ding-secret',
    showOnLogin: false,
    autoCreateUser: false,
  })
  assert.equal(dingTalk.provider, 'dingtalk-ent-app')
  assert.equal(dingTalk.sso.configuration.appKey, 'ding-key')
  assert.equal(dingTalk.sso.configuration.appSecret, 'ding-secret')
  assert.equal(dingTalk.sso.autoCreateUser, false)
  assert.deepEqual(dingTalk.integrationModes, [])

  const oauth2 = toApplicationPayload({
    ...createDraft('oauth2'),
    name: 'OAuth2 登录',
    authorizationUrl: 'https://id.example.com/authorize',
    tokenUrl: 'https://id.example.com/token',
    userInfoUrl: 'https://id.example.com/userinfo',
    clientId: 'client-id',
    secret: 'client-secret',
    userIdField: 'sub',
  }, {
    id: 'oauth-app',
    name: 'OAuth2 登录',
    provider: 'third-party',
    integrationModes: [{ value: 'page' }, { value: 'ssoClient' }],
    sso: { configuration: { type: 'oauth2' } },
  })
  assert.equal(oauth2.provider, 'third-party')
  assert.deepEqual(oauth2.integrationModes, ['page', 'ssoClient'])
  assert.equal(oauth2.sso.configuration.type, 'oauth2')
  assert.equal(oauth2.sso.configuration.oauth2.clientSecret, 'client-secret')
  assert.equal(oauth2.sso.configuration.oauth2.userProperty.userId, 'sub')
  assert.equal(oauth2.sso.configuration.oauth2.tokenRequestType, 'POST_BODY')

  const serialized = JSON.stringify([wechat, dingTalk, oauth2])
  for (const unsupported of ['displayName', 'syncOrganization', 'corpId', 'agentId', 'iconDataUrl']) {
    assert.equal(serialized.includes(unsupported), false)
  }
})

test('updates auto-create without replacing existing user provisioning settings', () => {
  const current = {
    id: 'oauth-app',
    name: 'OAuth2 登录',
    provider: 'third-party',
    integrationModes: ['ssoClient'],
    sso: {
      configuration: { type: 'oauth2', oauth2: {} },
      autoCreateUser: false,
      usernamePrefix: 'gitee-',
      defaultPasswd: 'ExistingPass123',
      roleIdList: ['role-1'],
      orgIdList: ['org-1'],
    },
  }
  const payload = toApplicationPayload({
    ...createDraft('oauth2'),
    name: current.name,
    authorizationUrl: 'https://gitee.com/oauth/authorize',
    tokenUrl: 'https://gitee.com/oauth/token',
    userInfoUrl: 'https://gitee.com/api/v5/user',
    clientId: 'client-id',
    secret: 'client-secret',
    userIdField: 'id',
    autoCreateUser: true,
    usernamePrefix: 'gitee-',
    roleIdList: ['role-2'],
    orgIdList: ['org-2'],
  }, current)

  assert.equal(payload.sso.autoCreateUser, true)
  assert.equal(payload.sso.usernamePrefix, 'gitee-')
  assert.equal(payload.sso.defaultPasswd, 'ExistingPass123')
  assert.deepEqual(payload.sso.roleIdList, ['role-2'])
  assert.deepEqual(payload.sso.orgIdList, ['org-2'])

  const cleared = toApplicationPayload({
    ...createDraft('oauth2'),
    name: current.name,
    usernamePrefix: '  ',
  }, current)
  assert.equal('usernamePrefix' in cleared.sso, false)
  assert.deepEqual(cleared.sso.roleIdList, [])
  assert.deepEqual(cleared.sso.orgIdList, [])
})
