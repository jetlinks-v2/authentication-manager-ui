import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import test from 'node:test'
import { build } from 'esbuild'

const built = await build({
  entryPoints: [fileURLToPath(new URL('../visDashboard/Base/QuickGuide/apiQuickGuide.ts', import.meta.url))],
  bundle: true, write: false, format: 'esm',
  plugins: [{
    name: 'quick-guide-request-fixture',
    setup(plugin) {
      plugin.onResolve({ filter: /^@jetlinks-web\/core$/ }, args => ({ path: args.path, namespace: 'request' }))
      plugin.onLoad({ filter: /.*/, namespace: 'request' }, () => ({
        contents: 'export const request = { post: (...args) => globalThis.quickGuideRequest(...args) }',
      }))
    },
  }],
})
const { loadQuickGuideRows } = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`)

function fixture(t, respond) {
  const calls = []
  globalThis.quickGuideRequest = async (path, data, options) => {
    calls.push({ path, data, options })
    return respond(path, data)
  }
  t.after(() => { delete globalThis.quickGuideRequest })
  return calls
}

test('space completion counts bindings across the tree and alarm completion counts configured visual tasks', async t => {
  const calls = fixture(t, path => {
    if (path === '/space/_query/tree') return { result: [{ id: 'parent', children: [{ id: 'child' }, { id: 'parent' }] }] }
    if (path === '/space/data-bind/_count') return { result: 2 }
    if (path === '/ai/aggregate/task/_count') return { result: 3 }
    throw new Error(`Unexpected endpoint ${path}`)
  })
  assert.deepEqual(await loadQuickGuideRows(), [{ id: 'space', value: 2 }, { id: 'alarm', value: 3 }])
  assert.deepEqual(calls.find(call => call.path === '/space/data-bind/_count').data, {
    terms: [{ column: 'spaceId', termType: 'in', value: ['parent', 'child'] }],
  })
  assert.ok(calls.every(call => call.options.hiddenError === true))
  assert.deepEqual(calls.find(call => call.path === '/ai/aggregate/task/_count').data, {})
})

test('an empty space tree remains incomplete and skips the binding query', async t => {
  const calls = fixture(t, path => {
    if (path === '/space/_query/tree') return { result: [] }
    if (path === '/ai/aggregate/task/_count') return { result: 0 }
    throw new Error(`Unexpected endpoint ${path}`)
  })
  assert.deepEqual(await loadQuickGuideRows(), [{ id: 'space', value: 0 }, { id: 'alarm', value: 0 }])
  assert.equal(calls.length, 2)
})

test('a failed space query preserves alarm configuration and a failed alarm query preserves space configuration', async t => {
  for (const failedPath of ['/space/_query/tree', '/ai/aggregate/task/_count']) {
    fixture(t, path => {
      if (path === failedPath) throw new Error('Unavailable')
      if (path === '/space/_query/tree') return { result: [{ id: 'space' }] }
      return { result: 1 }
    })
    assert.deepEqual(await loadQuickGuideRows(), failedPath === '/space/_query/tree'
      ? [{ id: 'space', failed: true }, { id: 'alarm', value: 1 }]
      : [{ id: 'space', value: 1 }, { id: 'alarm', failed: true }])
  }
})
