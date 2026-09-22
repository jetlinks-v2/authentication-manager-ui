import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDraft,
  filterConfigs,
  hasDuplicateIdentifier,
  identifierOf,
  isExampleSecret,
} from '../views/system/ThirdPartyLogin/model.ts'

test('new configuration starts empty and disabled', () => {
  const draft = createDraft('wechat')
  assert.equal(draft.name, '')
  assert.equal(draft.enabled, false)
  assert.equal(draft.showOnLogin, false)
})

test('temporary secret validation rejects real-looking or empty values', () => {
  assert.equal(isExampleSecret(''), false)
  assert.equal(isExampleSecret('sk_live_123456789'), false)
  assert.equal(isExampleSecret('demo-123'), false)
  assert.equal(isExampleSecret('demo-sample-secret'), true)
})

test('method-specific identifier and duplicate check', () => {
  const wecom = { ...createDraft('wecom'), corpId: 'corp-1', agentId: 'agent-1' }
  const record = { ...wecom, id: 'id-1', updatedAt: 'now' }
  assert.equal(identifierOf(wecom), 'corp-1/agent-1')
  assert.equal(hasDuplicateIdentifier([record], { ...wecom, corpId: 'CORP-1' }), true)
  assert.equal(hasDuplicateIdentifier([record], wecom, 'id-1'), false)
  assert.equal(hasDuplicateIdentifier([record], { ...createDraft('dingtalk'), corpId: 'corp-1' }), false)
})

test('type and text filters search names, labels and identifiers', () => {
  const wechat = { ...createDraft('wechat'), id: '1', name: '官方', displayName: '微信登录', appId: 'wx-1', updatedAt: 'now' }
  const oauth = { ...createDraft('oauth2'), id: '2', name: '外部身份源', displayName: '企业账号', clientId: 'client-2', updatedAt: 'now' }
  assert.deepEqual(filterConfigs([wechat, oauth], 'wechat', '').map(item => item.id), ['1'])
  assert.deepEqual(filterConfigs([wechat, oauth], 'all', 'CLIENT-2').map(item => item.id), ['2'])
  assert.deepEqual(filterConfigs([wechat, oauth], 'oauth2', '微信'), [])
  assert.deepEqual(filterConfigs([wechat, oauth], 'all', [{ column: 'keyword', termType: 'like', value: 'CLIENT-2' }]).map(item => item.id), ['2'])
  assert.deepEqual(filterConfigs([wechat, oauth], 'all', [
    { value: '企业' },
    { value: 'client-2', type: 'and' },
  ]).map(item => item.id), ['2'])
  assert.deepEqual(filterConfigs([wechat, oauth], 'all', [
    { value: 'wx-1' },
    { value: 'client-2', type: 'or' },
  ]).map(item => item.id), ['1', '2'])
})
