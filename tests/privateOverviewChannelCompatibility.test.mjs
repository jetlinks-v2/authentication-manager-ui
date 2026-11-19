import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'
const require = createRequire(import.meta.url)
const { build } = require('esbuild')
const root = fileURLToPath(new URL('../', import.meta.url))
const { outputFiles } = await build({ entryPoints: [path.join(root, 'api/overview.ts')], bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', plugins: [{ name: 'stubs', setup(b) {
  const stub = (filter, content) => { const namespace = `s${Math.random()}`; b.onResolve({ filter }, () => ({ path: 'stub', namespace })); b.onLoad({ filter: /.*/, namespace }, () => ({ contents: content, loader: 'js' })) }
  stub(/^@jetlinks-web\/core$/, 'export const request = { post: (...args) => context.post(...args) }')
  stub(/^@jetlinks-web-core\/locales$/, 'export default {global:{t: key => key}}')
} }] })
function fixture() {
  const context = { post: async url => {
    if (url === '/media/device/_query') return { result: { total: 5, data: [
      { id: 'a', provider: 'onvif', state: 'online' }, { id: 'b', provider: { value: 'onvif' }, state: 'offline' },
      { id: 'c', provider: 'gb28181-2016', state: 'degraded' }, { id: 'ignored', provider: 'media-plugin', state: 'online' }, { id: 'extra', provider: 'custom', state: 'online' },
    ] } }
    if (url.includes('/a/')) return { result: [{ status: 'online' }, { status: 'offline' }] }
    if (url.includes('/b/')) return { result: [{ status: 'online' }] }
    if (url.includes('/c/')) return { result: [{ status: 'online' }, { status: 'online' }] }
    if (url.includes('/ignored/')) return { result: [{ status: 'online' }] }
    if (url.includes('/extra/')) return { result: [{ status: 'offline' }, { status: 'online' }] }
    throw Error(url)
  } }
  const module = { exports: {} }
  Function('module', 'exports', 'require', 'context', outputFiles[0].text)(module, module.exports, require, context)
  return { api: module.exports, context }
}
test('default scope preserves legacy channel totals and state semantics', async () => {
  const { api } = fixture()
  assert.deepEqual(await api.queryOverviewChannelSummary(), { total: 5, online: 3 })
  assert.deepEqual(await api.queryOverviewChannelBreakdown(), [{ id: 'onvif', total: 3, online: 1 }, { id: 'gb28181-2016', total: 2, online: 2 }])
})
test('disconnected agent preserves established zero contribution; other errors propagate', async () => {
  const { api, context } = fixture()
  const post = context.post
  context.post = async url => { if (url.includes('/c/')) throw { code: 'error.agent_client_is_disconnected' }; return post(url) }
  assert.deepEqual(await api.queryOverviewChannelSummary(), { total: 3, online: 1 })
  context.post = async url => { if (url.includes('/c/')) throw Error('network'); return post(url) }
  await assert.rejects(api.queryOverviewChannelSummary(), /network/)
})

test('legacy all scope includes plugin and extension sources', async () => {
  const { api } = fixture()
  const rows = await api.queryOverviewChannelBreakdown('all')
  assert.deepEqual(rows.map(({ id, total, online }) => [id, total, online]), [
    ['onvif', 3, 1], ['gb28181-2016', 2, 2], ['media-plugin', 1, 1], ['custom', 2, 1],
  ])
})

test('SaaS breakdown uses the video list summary and counts the offline plugin channel', async () => {
  const { api, context } = fixture()
  const calls = []
  context.post = async (url, body) => {
    calls.push({ url, body })
    if (url === '/media/device/_query') return { result: [
      { id: 'gateway1', provider: 'agent-media-device-gateway', state: 'offline' },
      { id: 'gateway2', provider: 'agent-media-device-gateway', state: { value: 'online', text: '在线' } },
      { id: 'gateway3', provider: 'agent-media-device-gateway', state: 'offline' },
      { id: 'plugin', provider: 'media-plugin', state: 'offline' },
      { id: 'empty', provider: 'media-plugin', state: 'online' },
    ] }
    if (url === '/media/device/channel/_summary') return { result: {
      gateway1: { total: 2, online: 0 },
      gateway2: { total: 9, online: 9 },
      gateway3: { total: 6, online: 0 },
      plugin: { total: 1, online: 1 },
      deviceOutsideDirectory: { total: 20, online: 20 },
    } }
    throw Error(url)
  }

  assert.deepEqual(await api.querySaasOverviewChannelBreakdown(), [
    { id: 'agent-media-device-gateway', total: 17, online: 9 },
    { id: 'media-plugin', total: 1, online: 0 },
  ])
  assert.deepEqual(calls.map(call => call.url), ['/media/device/_query', '/media/device/channel/_summary'])
  assert.deepEqual(calls[1].body, { paging: false })
})

test('SaaS breakdown distinguishes empty statistics from unavailable or invalid results', async () => {
  const { api, context } = fixture()
  const post = context.post
  for (const [response, outcome] of [
    [{ result: {} }, 'empty'],
    [{ status: 403, success: false }, 'error'],
    [{ result: { a: { total: 1, online: 2 } } }, 'error'],
  ]) {
    context.post = async url => url === '/media/device/channel/_summary' ? response : post(url)
    if (outcome === 'empty') {
      assert.ok((await api.querySaasOverviewChannelBreakdown()).every(row => row.total === 0 && row.online === 0))
    } else {
      await assert.rejects(api.querySaasOverviewChannelBreakdown(), /Invalid media channel/)
    }
  }
  context.post = async url => url === '/media/device/_query' ? { status: 403, success: false } : { result: {} }
  await assert.rejects(api.querySaasOverviewChannelBreakdown(), /Media query failed/)
})

test('SaaS breakdown applies the video list device state rules to aggregated online counts', async () => {
  const { api, context } = fixture()
  context.post = async url => url === '/media/device/_query' ? { result: [
    { id: 'a', provider: 'onvif', state: 'error' },
    { id: 'b', provider: 'onvif', state: { value: 'failed' } },
    { id: 'c', provider: 'onvif', state: { text: 'online' } },
  ] } : { result: { a: { total: 1, online: 1 }, b: { total: 1, online: 1 }, c: { total: 1, online: 1 } } }
  assert.deepEqual(await api.querySaasOverviewChannelBreakdown(), [{ id: 'onvif', total: 3, online: 2 }])
})
