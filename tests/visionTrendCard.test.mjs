import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { build } from 'esbuild'
import { effectScope, nextTick, ref } from 'vue'

const require = createRequire(import.meta.url)
const result = await build({
  entryPoints: [fileURLToPath(new URL('../visDashboard/ResourceCenter/VisionTaskRanking/useVisionTaskTrend.ts', import.meta.url))],
  bundle: true, write: false, platform: 'node', format: 'cjs', external: ['vue'],
  plugins: [{ name: 'resource-boundaries', setup(api) {
    const mocks = {
      '../hooks/useResourceCapabilities': 'export const useResourceCapabilities=()=>context.capabilities;',
      '../services/gatewayStatus': 'export const loadGatewayDirectory=current=>context.load(current);',
      '@vueuse/core': 'export const useDocumentVisibility=()=>context.visibility;',
      '@jetlinks-web-core/utils/module-registry': 'export const moduleRegistry={getResourceItem:()=>context.component};',
    }
    api.onResolve({ filter: /.*/ }, args => args.path in mocks ? { path: args.path, namespace: 'fixture' } : undefined)
    api.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: mocks[args.path], loader: 'js' }))
  } }],
})
const settle = async () => { await nextTick(); await new Promise(setImmediate); await nextTick() }
function fixture(t, { preview = false, edge = true, vision = true } = {}) {
  const context = { component: {}, visibility: ref('visible'), capabilities: { scope: ref('user-a'), modules: ref({ edge, vision }) }, calls: [] }
  context.load = async current => { context.calls.push(current); return [{ id: context.capabilities.scope.value, name: 'Gateway', online: true }] }
  const module = { exports: {} }
  Function('require', 'module', 'exports', 'context', result.outputFiles[0].text)(require, module, module.exports, context)
  const scope = effectScope(), info = ref({ componentProps: { resourceCenterVisionTaskRanking: { title: '我的任务观测' } } })
  const hook = scope.run(() => module.exports.useVisionTaskTrend(info, ref(preview)))
  t.after(() => scope.stop())
  return { context, hook, info }
}

test('the existing card reads its saved title namespace and only loads the directory when visible and allowed', async t => {
  const { context, hook } = fixture(t)
  await settle(); assert.equal(hook.config.value.title, '我的任务观测'); assert.equal(context.calls.length, 1)
  assert.equal(hook.directory.data[0].id, 'user-a')
  context.visibility.value = 'hidden'; await settle(); assert.equal(hook.enabled.value, false)
  assert.equal(hook.directory.data, undefined); assert.equal(context.calls.length, 1)
  context.visibility.value = 'visible'; await settle(); assert.equal(context.calls.length, 2)
  context.capabilities.modules.value.vision = false; await settle(); assert.equal(hook.available.value, false)
  assert.equal(hook.directory.data, undefined)
})

test('editing and missing module capabilities do not request real nodes', async t => {
  for (const options of [{ preview: true }, { edge: false }, { vision: false }]) {
    const { context, hook } = fixture(t, options)
    await settle(); assert.equal(hook.enabled.value, false); assert.equal(context.calls.length, 0)
  }
})

test('changing user scope cancels an old directory and cannot give a previous account nodes to the sampler', async t => {
  const { context, hook } = fixture(t)
  await settle()
  let release, previousValid
  context.load = current => { previousValid = current; return new Promise(resolve => { release = resolve }) }
  void hook.directory.refresh(); await settle()
  const oldRelease = release
  context.load = async () => [{ id: 'gateway-b', name: 'B', online: true }]
  context.capabilities.scope.value = 'user-b'; await settle()
  assert.equal(previousValid(), false); assert.equal(hook.directory.data[0].id, 'gateway-b')
  oldRelease([{ id: 'gateway-a', name: 'A', online: true }]); await settle()
  assert.equal(hook.directory.data[0].id, 'gateway-b')
})

test('directory failures retain known nodes and retry promptly; permission loss clears them', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const { context, hook } = fixture(t)
  await settle()
  context.load = async () => { throw { status: 503 } }
  await hook.directory.refresh()
  assert.equal(hook.directory.error, true); assert.equal(hook.directory.data[0].id, 'user-a')
  let recovered = 0
  context.load = async () => { recovered++; return [{ id: 'recovered', name: 'Gateway', online: true }] }
  t.mock.timers.tick(2000); await settle()
  assert.equal(recovered, 1); assert.equal(hook.directory.error, false); assert.equal(hook.directory.data[0].id, 'recovered')
  context.load = async () => { throw { status: 403 } }
  await hook.directory.refresh(); assert.equal(hook.directory.data, undefined)
  context.load = async () => { recovered++; return [] }
  t.mock.timers.tick(60000); await settle(); assert.equal(recovered, 1)
})
