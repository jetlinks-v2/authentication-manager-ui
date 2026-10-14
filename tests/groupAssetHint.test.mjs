import assert from 'node:assert/strict'
import test from 'node:test'
import { groupAssetHint } from '../views/application-center/ApiApplication/groupGrantUtils.ts'

const group = { id: 'device-api', name: 'Device', assetTypes: ['device', 'product'] }
const scoped = assetType => ({ groupId: 'device-api', operationIds: ['query'], assetAccesses: { assetType, accesses: [{ supportId: 'org' }] } })

test('groups without asset types show no asset hint', () => {
  assert.equal(groupAssetHint({ ...group, assetTypes: [] }, [scoped('device')]), undefined)
  assert.equal(groupAssetHint({ ...group, assetTypes: [] }, [], true), undefined)
})

test('api-client grants keep the preserved / required distinction', () => {
  assert.deepEqual(groupAssetHint(group, [scoped('device'), scoped('product')]),
    { type: 'info', message: 'ThirdPartyApplication.direct.assetScopePreserved' })
  assert.deepEqual(groupAssetHint(group, [scoped('device')]),
    { type: 'warning', message: 'ThirdPartyApplication.direct.assetScopeRequired' })
  assert.deepEqual(groupAssetHint(group, [{ ...scoped('device'), groupId: 'other' }, scoped('product')]),
    { type: 'warning', message: 'ThirdPartyApplication.direct.assetScopeRequired' })
  assert.deepEqual(groupAssetHint(group, [{ ...scoped('device'), assetAccesses: { assetType: 'device', accesses: [] } }, scoped('product')]),
    { type: 'warning', message: 'ThirdPartyApplication.direct.assetScopeRequired' })
})

test('template grants always explain the instance / creator data scope', () => {
  const hint = { type: 'info', message: 'ApplicationTemplate.grants.assetScopeByCreator' }
  assert.deepEqual(groupAssetHint(group, [], true), hint)
  assert.deepEqual(groupAssetHint(group, [scoped('device'), scoped('product')], true), hint)
})
