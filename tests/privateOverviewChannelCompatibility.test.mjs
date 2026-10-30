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
test('SaaS summary preserves channel totals and state semantics when grouped by provider', async () => {
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

test('private all scope includes plugin and extension without changing SaaS default', async () => {
 const {api}=fixture(); const rows=await api.queryOverviewChannelBreakdown('all')
 assert.deepEqual(rows.map(({id,total,online})=>[id,total,online]),[['onvif',3,1],['gb28181-2016',2,2],['media-plugin',1,1],['custom',2,1]])
 assert.deepEqual(await api.queryOverviewChannelSummary(),{total:5,online:3})
})
