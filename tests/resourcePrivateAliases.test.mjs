import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'
const require = createRequire(import.meta.url), { build } = require('esbuild')
const root = fileURLToPath(new URL('../', import.meta.url))
const result = await build({ stdin: { contents: `export * from ${JSON.stringify(path.join(root, 'visDashboard/useDashboardModules.ts'))};export * from ${JSON.stringify(path.join(root, 'views/resources/Dashboard/services/resourcePageAccess.ts'))}`, resolveDir: root, loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', plugins: [{ name: 'boundaries', setup(api) {
  const stubs = {
    '@jetlinks-web-core/utils/module-registry': 'export const moduleRegistry={hasModule:name=>context.installed.includes(name)}',
    '@jetlinks-web-core/store/menu': 'export const useMenuStore=()=>context.menu',
    '@jetlinks-web-core/utils/consts': 'export const isSaaS=false',
    '@jetlinks-web-core/utils/deployment': 'export const isPrivateDeployment=()=>true',
  }
  api.onResolve({ filter: /.*/ }, args => stubs[args.path] ? { path: args.path, namespace: 'stub' } : undefined)
  api.onLoad({ filter: /.*/, namespace: 'stub' }, args => ({ contents: stubs[args.path], loader: 'js' }))
} }] })
const context = { installed: ['edge-master-ui', 'device-manager-ui', 'jetlinks-ai-ui', 'jetlinks-media-ui'], menu: { initialized: true, loading: false, menuResultCache: [] } }
const mod = { exports: {} }
Function('module', 'exports', 'require', 'context', result.outputFiles[0].text)(mod, mod.exports, require, context)
test('published device and AI menu aliases give page and shared panels consistent authorization', () => {
  for (const device of ['iot-user-device-list', 'iot-user/device/list']) for (const ai of ['algorithm-center', 'project/algorithm-center']) {
    context.menu.menuResultCache = [{ code: 'root', children: [device, ai, 'video/resources'].map(code => ({ code })) }]
    const shared = mod.exports.getDashboardModules()
    const page = mod.exports.resolveResourcePageAccess({ saas: false, menus: context.menu.menuResultCache, installed: name => context.installed.includes(name) })
    assert.equal(shared.edge, true)
    assert.equal(shared.vision, true)
    assert.equal(page.edge, shared.edge)
    assert.equal(page.vision, shared.edge && shared.vision && page.video)
  }
  context.menu.menuResultCache = [{ code: 'iot-user/device/list/detail' }, { code: 'project/algorithm-center/detail' }]
  assert.equal(mod.exports.getDashboardModules().edge, false)
  assert.equal(mod.exports.getDashboardModules().vision, false)
  const page = mod.exports.resolveResourcePageAccess({ saas: false, menus: context.menu.menuResultCache, installed: name => context.installed.includes(name) })
  assert.equal(page.edge, false)
  assert.equal(page.vision, false)
})
