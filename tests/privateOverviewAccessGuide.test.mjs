import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'
const require = createRequire(import.meta.url)
const { build } = require('esbuild')
const root = fileURLToPath(new URL('../', import.meta.url))
const base = path.join(root, 'visDashboard/Base/Private/services')
const { outputFiles } = await build({
  stdin: { contents: `export * from ${JSON.stringify(path.join(base, 'access.ts'))}; export * from ${JSON.stringify(path.join(base, 'guide.ts'))}`, resolveDir: root, loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  plugins: [{ name: 'boundaries', setup(b) {
    const stub = (filter, contents) => { const namespace = `s${Math.random()}`; b.onResolve({ filter }, () => ({ path: 'stub', namespace })); b.onLoad({ filter: /.*/, namespace }, () => ({ contents, loader: 'js' })) }
    stub(/^@jetlinks-web-core\/utils\/module-registry$/, 'export const moduleRegistry = { hasModule: name => context.modules.includes(name) }')
    stub(/^@jetlinks-web-core\/utils\/deployment$/, 'export const isPrivateDeployment = () => true')
    stub(/^@jetlinks-web-core\/store\/menu$/, 'export const useMenuStore = () => context.menu')
    stub(/^@jetlinks-web-core\/store\/auth$/, 'export const useAuthStore = () => ({ hasPermission: () => context.permission })')
    stub(/^@jetlinks-web\/core$/, 'export const request = { post: (...args) => context.post(...args) }')
    stub(/api\/overview$/, 'export const queryOverviewIotDeviceSummary=()=>context.summary("iot"); export const queryOverviewChannelBreakdown=(scope)=>context.breakdown(scope)')
  } }],
})
function fixture(codes = [], modules = ['device-manager-ui', 'jetlinks-media-ui', 'jetlinks-ai-ui']) {
  const calls = []
  const context = { modules, permission: true, menu: { initialized: true, loading: false, menuResultCache: [{ children: codes.map(code => ({ code })) }] }, calls,
    post: async (url, body) => { calls.push({ url, body }); return { result: { total: 0 } } },
    summary: async id => { calls.push({ id }); return { total: 0 } },
    breakdown: async scope => { calls.push({ scope }); return [{total:0}] },
  }
  const module = { exports: {} }
  Function('module', 'exports', 'require', 'context', outputFiles[0].text)(module, module.exports, require, context)
  return { api: module.exports, context }
}
const codes = ['iot-user-device-list', 'device/Product', 'link/Protocol', 'link/Type', 'link/AccessConfig', 'video/resources', 'media/Stream']

test('unresolved menus and uninstalled modules do not grant access or make guide queries', async () => {
  const { api, context } = fixture(codes, [])
  assert.equal(api.getPrivateOverviewAccess().iot, false)
  assert.equal(api.getPrivateOverviewAccess().video, false)
  assert.deepEqual(await api.loadPrivateGuide(), { lanes: [], complete: 0, total: 0, show: false })
  context.modules = ['device-manager-ui', 'jetlinks-media-ui']
  context.menu.initialized = false
  assert.deepEqual(await api.loadPrivateGuide(), { lanes: [], complete: 0, total: 0, show: false })
  assert.deepEqual(context.calls, [])
})

test('guide reflects real completion and selects first incomplete step per lane', async () => {
  const { api, context } = fixture(codes)
  context.post = async (url, body) => { context.calls.push({ url, body }); return { result: { total: ['/protocol/_query', '/media/server/_query'].includes(url) ? 1 : 0 } } }
  const guide = await api.loadPrivateGuide()
  assert.equal(guide.show, true)
  assert.equal(guide.complete, 2)
  const iot = guide.lanes.find(lane => lane.id === 'iot')
  const video = guide.lanes.find(lane => lane.id === 'video')
  assert.deepEqual(iot.steps.map(step => step.id), ['protocol', 'network', 'gateway', 'product', 'device'])
  assert.equal(iot.steps.find(step => step.next).id, 'network')
  assert.equal(video.steps.find(step => step.next).id, 'videoAccess')
  assert.ok(context.calls.some(call => call.scope === 'all'))
  assert.deepEqual(context.calls.find(call => call.url === '/media/device/_query').body.terms, [])
})

test('unknown prerequisite does not claim a later step as next', async () => {
  const { api, context } = fixture(codes)
  context.post = async url => { if (url === '/protocol/_query') throw Error('offline'); return { result: { total: 0 } } }
  const guide = await api.loadPrivateGuide()
  const iot = guide.lanes.find(lane => lane.id === 'iot')
  assert.equal(iot.steps[0].state, 'unknown')
  assert.ok(iot.steps.every(step => !step.next))
})
