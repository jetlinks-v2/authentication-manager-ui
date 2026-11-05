import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'

const require = createRequire(import.meta.url), { build } = require('esbuild')
const root = fileURLToPath(new URL('../', import.meta.url))
const result = await build({ entryPoints: [path.join(root, 'views/resources/Dashboard/services/resourceSupplemental.ts')], bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', plugins: [{ name: 'boundaries', setup(api) {
  api.onResolve({ filter: /^@jetlinks-web\/core$/ }, () => ({ path: 'request', namespace: 'stub' }))
  api.onResolve({ filter: /api\/overview$/ }, () => ({ path: 'overview', namespace: 'stub' }))
  api.onLoad({ filter: /.*/, namespace: 'stub' }, args => ({ contents: args.path === 'request' ? 'export const request=context.request' : 'export const buildOverviewDeviceTerms=()=>[]', loader: 'js' }))
} }] })
const rows = [
  { id: 'one', platformType: { value: 'mobile', text: '移动' }, usedFlow: 30, totalFlow: 100, cardTotal: 3 },
  { id: 'two', platformType: { value: 'mobile', text: '移动' }, usedFlow: 20, totalFlow: 200, cardTotal: 2 },
  { id: 'three', platformType: { value: 'telecom', text: '电信' }, usedFlow: 0, totalFlow: 50, cardTotal: 1 },
  { id: 'four', usedFlow: 5, totalFlow: 10, cardTotal: 0 },
]
const context = { request: { post: async (path) => { assert.equal(path, '/network/card/pool/query/_detail'); return { result: { data: rows, total: rows.length } } } } }
const mod = { exports: {} }
Function('module', 'exports', 'require', 'context', result.outputFiles[0].text)(mod, mod.exports, require, context)
test('groups pools by operator dictionary and retains unclassified data', async () => {
  const value = await mod.exports.loadResourceSupplemental('pools', 'today')
  assert.deepEqual(value.pools, [
    { id: 'operator:mobile', name: '移动', used: 50, total: 300, cards: 5 },
    { id: 'operator:telecom', name: '电信', used: 0, total: 50, cards: 1 },
    { id: 'operator:unclassified', name: '', used: 5, total: 10, cards: 0 },
  ])
})
