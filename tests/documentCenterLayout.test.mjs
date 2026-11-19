import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import { transformSync } from 'esbuild'
import * as vue from 'vue'
import { parse, compileScript } from 'vue/compiler-sfc'
import { renderToString } from 'vue/server-renderer'

const require = createRequire(import.meta.url)
const state = {
  open: vue.ref(true), loading: vue.ref(false), failed: vue.ref(false), frameKey: vue.ref(1),
  url: vue.ref('https://docs.example.com/jetlinks/test'),
  frameUrl: vue.ref('https://docs.example.com/jetlinks/test?embed=1&language=zh-CN'),
  unavailable: vue.ref('unconfigured'), setOpen() {}, reload() {}, onLoad() {}, onError() {},
}

function loadComponent(url, dependencies = {}, autoImports = '') {
  const filename = url.pathname
  const { descriptor } = parse(readFileSync(url, 'utf8'), { filename })
  const source = autoImports + compileScript(descriptor, { id: filename, inlineTemplate: true }).content
  const { code } = transformSync(source, { loader: 'ts', format: 'cjs' })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(identifier =>
    identifier in dependencies ? dependencies[identifier] : require(identifier), module, module.exports)
  return module.exports.default
}

const DrawerShell = loadComponent(new URL('../../../jetlinks-web-core/src/components/JlDrawerShell/index.vue', import.meta.url), {},
  "import { ref, computed, onMounted, onBeforeUnmount } from 'vue';\n")
const DocumentCenter = loadComponent(new URL('../components/DocumentCenter/index.vue', import.meta.url), {
  '@jetlinks-web-core/components/JlDrawerShell/index.vue': DrawerShell,
  '@jetlinks-web-core/components/CloudEmpty/index.vue': () => null,
  './useDocumentCenter': { useDocumentCenter: () => state },
  'vue-i18n': { useI18n: () => ({ t: key => key }) },
})

async function render(component, props = {}) {
  const drawers = []
  const app = vue.createSSRApp(component, props)
  app.component('ADrawer', vue.defineComponent({
    props: ['open', 'width', 'contentWrapperStyle', 'getContainer', 'rootStyle', 'mask', 'push', 'autofocus'],
    setup(props, { slots }) {
      drawers.push({ ...props })
      return () => vue.h('section', { 'data-drawer': true }, slots.default?.())
    },
  }))
  app.component('AButton', (_, { slots }) => vue.h('button', slots.default?.()))
  app.component('AIcon', () => vue.h('span'))
  app.component('ASpin', () => vue.h('span'))
  app.component('AAlert', () => vue.h('span'))
  const context = {}
  const html = await renderToString(app, context)
  return { html, teleports: context.teleports || {}, drawers }
}

test('document window teleports outside the header and disables only its own drawer portal', async () => {
  const { html, teleports, drawers } = await render(DocumentCenter)
  assert.match(html, /document-center-entry/)
  assert.doesNotMatch(html, /data-drawer/)
  assert.match(teleports.body || '', /data-drawer/)
  assert.match(teleports.body, /document-center-frame/)
  assert.equal(drawers.length, 1)
  assert.equal(drawers[0].getContainer, false)
  assert.equal(drawers[0].rootStyle.position, 'fixed')
  assert.equal(drawers[0].mask, false)
  assert.equal(drawers[0].push, false)
  assert.equal(drawers[0].autofocus, false)
  assert.equal(drawers[0].width, 480)
  assert.equal(drawers[0].contentWrapperStyle.right, 'var(--space-4)')
})

test('ordinary drawer callers retain the original portal and modal defaults', async () => {
  const { html, teleports, drawers } = await render(DrawerShell, { open: true, title: 'Edit' })
  assert.match(html, /data-drawer/)
  assert.deepEqual(teleports, {})
  assert.equal(drawers[0].getContainer, undefined)
  assert.equal(drawers[0].rootStyle, undefined)
  assert.equal(drawers[0].mask, undefined)
  assert.equal(drawers[0].push, undefined)
})
