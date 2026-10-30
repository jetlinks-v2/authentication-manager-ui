import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'

const require = createRequire(import.meta.url)
const { build } = require('esbuild')
const root = fileURLToPath(new URL('../', import.meta.url))
const result = await build({
  entryPoints: [path.join(root, 'visDashboard/Base/Saas/useSaasUtilities.ts')],
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  plugins: [{ name: 'help-fixture', setup(build) {
    const stubs = {
      'vue-i18n': `export const useI18n = () => ({ t: key => key })`,
      auth: `export const useAuthStore = () => ({ hasPermission: () => false })`,
      config: `export const createDefaults = () => ({ chart: {} })`,
      navigation: `export const HOME_TARGETS = { scene: { menus: [] } }`,
      useHomeNavigation: `export const useHomeNavigation = () => ({ canOpen: () => false })`,
      access: `export const getSaasGrantedMenus = () => new Set(); export const hasSaasTarget = () => false`,
      targets: `export const SAAS_QUICK_ACTIONS = []`,
    }
    build.onResolve({ filter: /^(vue-i18n|@jetlinks-web-core\/store\/auth|.*\/shared\/(config|navigation|useHomeNavigation)|\.\/services\/access|\.\/targets)$/ }, args => ({ path: args.path.split('/').pop(), namespace: 'fixture' }))
    build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: stubs[args.path], loader: 'js' }))
  } }],
})
const module = { exports: {} }
Function('module', 'exports', 'require', result.outputFiles[0].text)(module, module.exports, require)

test('help entries open the corresponding provided documents, while preview does not navigate', () => {
  const expected = [
    ['device', 'e4294173d3f74837ff1891d50084c4b7'],
    ['gateway', '4b41462f3aaa69f665e35410f816a8ea'],
    ['video', 'f0fe2963e862ce7b0a4c33521b168e12'],
    ['alarm', '1d9a3bea1d9f1efda0c8ae899cae96f3'],
    ['dashboard', '1c7ceeb3ac409447ddb63bc1dbefbd96'],
    ['application', '4b939a760f186fff6fdc05c5bf268392'],
    ['faq', 'e90567388f9ff5cb184dc7b58ad17e9e'],
  ]
  const previousWindow = globalThis.window
  const calls = []
  globalThis.window = { open: (...args) => calls.push(args) }
  try {
    const state = module.exports.useSaasUtilities(() => false)
    assert.deepEqual(state.documents.value.map(doc => doc.id), expected.slice(0, 4).map(([id]) => id))
    for (const [id, documentId] of expected) state.openHelp(id)
    assert.deepEqual(calls, expected.map(([, documentId]) => [`https://hanta.yuque.com/px7kg1/rk46tv/${documentId}?singleDoc#`, '_blank', 'noopener,noreferrer']))
    state.openHelpCenter()
    assert.deepEqual(calls.at(-1), ['https://hanta.yuque.com/px7kg1/rk46tv/6da59c1ac931da9ee77cdf8e73f56aba?singleDoc#', '_blank', 'noopener,noreferrer'])
    module.exports.useSaasUtilities(() => true).openHelp('device')
    module.exports.useSaasUtilities(() => true).openHelpCenter()
    assert.equal(calls.length, expected.length + 1)
  } finally {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
})
