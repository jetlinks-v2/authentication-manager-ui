import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import test from 'node:test'
import * as vue from 'vue'

const root = resolve(import.meta.dirname, '..')
const require = createRequire(import.meta.url)
const { transformSync } = require('esbuild')

const fixture = (options = {}) => {
  const calls = []
  const organizationCalls = []
  const module = { exports: {} }
  const { code } = transformSync(readFileSync(resolve(root,
    'views/application-center/ProjectApplication/ownershipSelectors.ts'), 'utf8'), { loader: 'ts', format: 'cjs' })
  new Function('require', 'exports', 'module', code)(id => {
    if (id.endsWith('/system/user')) return { getUserList_api: async params => {
      calls.push(params)
      return { success: options.success !== false, result: { data: options.users ?? [{ id: 'other', name: '张三', username: 'zhangsan@tenant' }] } }
    } }
    if (id.endsWith('/system/department')) return { getTreeData_api: async params => {
      organizationCalls.push(params)
      return { success: options.success !== false, result: [
        { id: 'root', name: '华东', children: [{ id: 'child', name: '研发' }] },
      ] }
    } }
    if (id.endsWith('.vue')) return {}
    throw new Error(`Unexpected import: ${id}`)
  }, module.exports, module)
  const registration = { exports: {} }
  const registrationCode = transformSync(readFileSync(resolve(root, 'register.ts'), 'utf8'), { loader: 'ts', format: 'cjs' }).code
  new Function('require', 'exports', 'module', registrationCode)(id => {
    if (id === 'vue') return vue
    if (id.endsWith('/ownershipSelectors')) return module.exports
    if (id.endsWith('/system/department')) return { getTreeData_api: () => { throw new Error('Unexpected registration request') } }
    if (id.endsWith('/system/permission')) return { exportPermission_api: () => { throw new Error('Unexpected registration request') } }
    throw new Error(`Unexpected registration import: ${id}`)
  }, registration.exports, registration)
  return { api: module.exports.createOwnershipCreatorSelector().optionPanel, calls,
    organizationApi: module.exports.createOwnershipOrganizationSelector().optionPanel, organizationCalls,
    resources: registration.exports.default }
}

test('creator directory is lazy and uses server search with the requested page', async () => {
  const { api, calls } = fixture()
  assert.equal(calls.length, 0)
  assert.deepEqual(await api.loadOptions('张', { pageIndex: 2, pageSize: 15 }), [
    { value: 'other', label: '张三 (zhangsan)' },
  ])
  assert.equal(calls[0].pageIndex, 2)
  assert.equal(calls[0].pageSize, 15)
  assert.deepEqual(calls[0].terms, [
    { column: 'name', termType: 'like', value: '%张%' },
    { column: 'username', termType: 'like', value: '%张%', type: 'or' },
  ])
})

test('creator names are queried only by explicit IDs and an empty selection makes no request', async () => {
  const { api, calls } = fixture({ users: [
    { id: 'other', name: '张三', username: 'zhang@san@tenant' },
    { id: 'plain', username: 'admin' },
    { id: 'nameOnly', name: '李四' },
    { id: 'missing' },
  ] })
  assert.deepEqual(await api.loadSelectedOptions([]), [])
  assert.equal(calls.length, 0)
  assert.deepEqual(await api.loadSelectedOptions(['other', 'plain', 'nameOnly', 'missing', 'deleted']), [
    { value: 'other', label: '张三 (zhang@san)' },
    { value: 'plain', label: 'admin' },
    { value: 'nameOnly', label: '李四' },
    { value: 'missing', label: 'missing' },
  ])
  assert.equal(calls[0].paging, false)
  assert.deepEqual(calls[0].terms, [{ column: 'id', termType: 'in', value: ['other', 'plain', 'nameOnly', 'missing', 'deleted'] }])
})

test('directory failures stay visible to the condition editor', async () => {
  const { api, calls } = fixture({ success: false })
  await assert.rejects(api.loadOptions(), /User query failed/)
  assert.equal(calls.length, 1)
})

test('tenant registration declares only manual ID input and never queries a directory', () => {
  const { organizationCalls, calls, resources } = fixture()
  const tenant = resources.assetDimensionFilters.tenant
  assert.deepEqual(tenant.getOperators(), ['targets', 'notTargets', 'bound', 'unbound'])
  assert.equal(tenant.allowIdInput, true)
  assert.equal(tenant.createSelector, undefined)
  assert.equal(organizationCalls.length, 0)
  assert.equal(calls.length, 0)
})

test('organization loads a complete visible tree lazily, preserving children for local search and label paths', async () => {
  const { organizationApi, organizationCalls, resources } = fixture()
  const org = resources.assetDimensionFilters.org
  assert.equal(org.supportsClosure, true)
  org.createSelector()
  assert.equal(organizationCalls.length, 0)
  assert.deepEqual(await organizationApi.loadOptions('ignored local keyword'), [
    { value: 'root', label: '华东', children: [{ value: 'child', label: '研发', children: undefined }] },
  ])
  assert.deepEqual(organizationCalls, [{ paging: false, terms: [] }])
})

test('organization errors stay visible to the editor', async () => {
  const { organizationApi } = fixture({ success: false })
  await assert.rejects(organizationApi.loadOptions(), /Organization query failed/)
})
