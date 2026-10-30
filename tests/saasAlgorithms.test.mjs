import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
const require = createRequire(import.meta.url)
const { build } = require('esbuild')
const file = fileURLToPath(new URL('../visDashboard/Base/Saas/services/algorithms.ts', import.meta.url))
const output = await build({ entryPoints: [file], bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', plugins: [{ name: 'request', setup(b) { b.onResolve({ filter: /^@jetlinks-web\/core$/ }, () => ({ path: 'request', namespace: 'stub' })); b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const request = context.request' })) } }] })
function fixture() { const context = { request: {} }; const module = { exports: {} }; Function('module', 'exports', 'require', 'context', output.outputFiles[0].text)(module, module.exports, require, context); return { api: module.exports, context } }
const scenes = [{ id: 's1', children: [{ value: 'a' }, { value: 'a' }, { value: 'b' }] }, { id: 's2', children: [{ value: 'a' }] }]
const coverage = [{ sceneId: 's1', taskTarget: { value: 'a' }, channelCount: 3 }, { sceneId: 's1', taskTarget: 'a', channelCount: 8 }, { sceneId: 's1', taskTarget: 'b', channelCount: 0 }, { sceneId: 'other', taskTarget: 'x', channelCount: 5 }]
test('algorithm identity deduplicates scene and target and intersects positive coverage', () => {
 const { api } = fixture(); const keys = api.saasAlgorithmKeys(scenes)
 assert.equal(keys.size, 3); assert.equal(api.countSaasEnabledAlgorithms(keys, coverage), 1)
 assert.throws(() => api.saasAlgorithmKeys([{ id: 's', children: [{}] }]))
 assert.throws(() => api.countSaasEnabledAlgorithms(keys, [{ sceneId: 's1', taskTarget: 'a', channelCount: -1 }]))
})
test('algorithm coverage failure retains total as unknown statuses', async () => {
 const { api, context } = fixture(); context.request.post = async () => ({ result: scenes }); context.request.get = async () => { throw Error('unavailable') }
 assert.deepEqual(await api.loadSaasAlgorithmSummary(true), { total: 3 })
 context.request.get = async () => ({ result: coverage }); assert.deepEqual(await api.loadSaasAlgorithmSummary(true), { total: 3, edgeEnabled: 1, edgeDisabled: 2 })
 assert.deepEqual(await api.loadSaasAlgorithmSummary(false), { total: 3 })
})
