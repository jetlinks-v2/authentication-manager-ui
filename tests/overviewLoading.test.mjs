import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const require = createRequire(import.meta.url)
const { build } = require('esbuild')
const vue = require('vue')
const root = fileURLToPath(new URL('../', import.meta.url))
const helper = fileURLToPath(new URL('../views/project/Overview/useOverviewAsync.ts', import.meta.url))
const result = await build({ entryPoints: [helper], bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  plugins: [{ name: 'skeleton-boundary', setup(api) {
    api.onResolve({ filter: /PageRouteSkeleton\/index\.vue$/ }, () => ({ path: 'skeleton', namespace: 'skeleton' }))
    api.onLoad({ filter: /.*/, namespace: 'skeleton' }, () => ({ contents: `export default {render(){return 'page-loading'}}` }))
  } }],
})
const module = { exports: {} }
Function('module', 'exports', 'require', result.outputFiles[0].text)(module, module.exports, require)
const { createOverviewAsyncComponent, useOverviewLayout } = module.exports
const renderer = vue.createRenderer({
  createElement: type => ({ type, children: [], parent: null }), createText: text => ({ type: '#text', text, parent: null }),
  createComment: text => ({ type: '#comment', text, parent: null }), setText: (node, text) => { node.text = text },
  setElementText: (node, text) => { node.children = []; node.text = text },
  parentNode: node => node.parent, nextSibling: node => { const siblings = node.parent?.children || []; return siblings[siblings.indexOf(node) + 1] || null },
  insert(node, parent, anchor) { if (node.parent) { const i = node.parent.children.indexOf(node); if (i >= 0) node.parent.children.splice(i, 1) } node.parent = parent; const i = anchor ? parent.children.indexOf(anchor) : -1; parent.children.splice(i < 0 ? parent.children.length : i, 0, node) },
  remove(node) { const i = node.parent?.children.indexOf(node) ?? -1; if (i >= 0) node.parent.children.splice(i, 1); node.parent = null },
  patchProp() {},
})
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const text = node => [node.text || '', ...(node.children || []).map(text)].join('')
const tick = async () => { await Promise.resolve(); await vue.nextTick(); await new Promise(setImmediate); await vue.nextTick() }
const card = value => ({ render: () => vue.h('div', value) })
const loading = card('card-loading')
function mount(component) { const root = { children: [] }; const app = renderer.createApp(component); app.mount(root); return { root, app } }

test('immediate placeholders and independent cards under Suspense; late resolution after unmount does not mount', async () => {
  const fast = deferred(), slow = deferred()
  const Fast = createOverviewAsyncComponent(() => fast.promise, loading)
  const Slow = createOverviewAsyncComponent(() => slow.promise, loading)
  let mounted = 0
  const { root, app } = mount({ render: () => vue.h(vue.Suspense, null, { default: () => vue.h('section', [vue.h(Fast), vue.h(Slow)]), fallback: () => vue.h('div', 'suspense-fallback') }) })
  assert.equal(text(root), 'card-loadingcard-loading')
  fast.resolve(card('fast-ready')); await tick()
  assert.equal(text(root), 'fast-readycard-loading')
  app.unmount()
  slow.resolve({ mounted() { mounted++ }, render: () => vue.h('div', 'late') }); await tick()
  assert.equal(mounted, 0); assert.equal(text(root), '')
})

test('layout failure is captured by parent and retry creates a fresh instance', async () => {
  const first = deferred(), second = deferred(); let calls = 0, state
  const previous = console.error; console.error = () => {}
  try {
    const { root, app } = mount({ setup() { state = useOverviewLayout(() => (++calls === 1 ? first.promise : second.promise)); return () => state.failed.value ? vue.h('div', 'error') : vue.h(state.component.value) } })
    assert.equal(text(root), 'page-loading'); assert.equal(calls, 1)
    first.reject(new Error('load failed')); await tick()
    assert.equal(text(root), 'error'); assert.equal(state.failed.value, true)
    state.retry(); await vue.nextTick()
    assert.equal(text(root), 'page-loading'); assert.equal(calls, 2)
    second.resolve(card('page-ready')); await tick()
    assert.equal(text(root), 'page-ready'); assert.equal(state.failed.value, false)
    app.unmount()
  } finally { console.error = previous }
})

test('the actual overview page imports only the selected deployment layout', async () => {
  const { parse, compileScript } = require('vue/compiler-sfc')
  const fs = require('node:fs'), path = require('node:path')
  const file = path.join(root, 'views/project/Overview/index.vue')
  const descriptor = parse(fs.readFileSync(file, 'utf8'), { filename: file }).descriptor
  const source = compileScript(descriptor, { id: 'overview', inlineTemplate: true }).content
  for (const saas of [true, false]) {
    const buildResult = await build({ stdin: { contents: source, resolveDir: path.dirname(file), loader: 'ts' }, bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', plugins: [{ name: 'page-boundaries', setup(api) {
      api.onResolve({ filter: /^(vue-i18n|@jetlinks-web-core\/utils\/consts|@jetlinks-web-core\/components\/PageRouteSkeleton\/index\.vue|\.\/(SaasOverviewPage|PrivateOverviewLayout)\.vue)$/ }, args => ({ path: args.path, namespace: 'boundary' }))
      api.onLoad({ filter: /.*/, namespace: 'boundary' }, args => {
        const source = args.path === 'vue-i18n' ? `export const useI18n=()=>({t:key=>key})`
          : args.path.endsWith('/consts') ? `export const isSaaS=${saas}`
            : args.path.includes('PageRouteSkeleton') ? `export default {render(){return 'loading'}}`
              : `export const __esModule=true; context.loaded.push(${JSON.stringify(args.path)}); export default {render(){return 'layout'}}`
        return { contents: source, loader: 'js' }
      })
    } }] })
    const context = { loaded: [] }, mod = { exports: {} }
    Function('module', 'exports', 'require', 'context', buildResult.outputFiles[0].text)(mod, mod.exports, require, context)
    const { root: host, app } = mount(mod.exports.default)
    await tick()
    assert.deepEqual(context.loaded, [saas ? './SaasOverviewPage.vue' : './PrivateOverviewLayout.vue'])
    assert.equal(text(host), 'layout')
    app.unmount()
  }
})

test('card skeleton compiles with its accessible loading state and Ant components', () => {
  const { parse, compileScript, compileTemplate } = require('vue/compiler-sfc')
  const fs = require('node:fs'), path = require('node:path')
  const file = path.join(root, 'views/project/Overview/OverviewCardLoading.vue')
  const { descriptor, errors } = parse(fs.readFileSync(file, 'utf8'), { filename: file })
  assert.deepEqual(errors, [])
  const script = compileScript(descriptor, { id: 'card' })
  const template = compileTemplate({ source: descriptor.template.content, filename: file, id: 'card', compilerOptions: { bindingMetadata: script.bindings } })
  assert.deepEqual(template.errors, [])
  assert.match(template.code, /aria-busy/)
  assert.match(template.code, /SkeletonInput/)
  assert.match(template.code, /Skeleton/)
})
