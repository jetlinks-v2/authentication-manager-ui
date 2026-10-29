import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
const compiled = await build({ entryPoints: [fileURLToPath(new URL('../api/overview.ts', import.meta.url))], bundle: true, write: false, platform: 'node', format: 'esm', plugins: [{ name: 'overview-boundaries', setup(api) {
  api.onResolve({ filter: /^@jetlinks-web\/core$|^@jetlinks-web-core\/locales$/ }, args => ({ path: args.path, namespace: 'stub' }))
  api.onLoad({ filter: /.*/, namespace: 'stub' }, args => ({ contents: args.path.endsWith('locales') ? 'export default {global:{t:key=>key}}' : 'export const request={post:(...args)=>globalThis.__gatewayOverviewPost(...args)}' }))
} }] })
const { queryOverviewGatewayPage } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`)

test('gateway directory maps the product name supplied by device details without inventing a missing name', async () => {
  globalThis.__gatewayOverviewPost = async (url, body) => {
    assert.equal(url, '/device/instance/detail/_query')
    assert.equal(body.pageIndex, 2)
    return { result: { total: 2, data: [{ id: 'a', name: 'A', productName: 'Product', state: 'online' }, { id: 'b', name: 'B' }] } }
  }
  const page = await queryOverviewGatewayPage(100, 2)
  assert.equal(page.data[0].productName, 'Product')
  assert.equal(page.data[0].online, true)
  assert.equal(page.data[1].productName, undefined)
  assert.equal(page.total, 2)
})
