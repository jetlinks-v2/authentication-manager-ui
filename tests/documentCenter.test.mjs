import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import { transformSync } from 'esbuild'
import { effectScope, h, nextTick, reactive, ref } from 'vue'

const require = createRequire(import.meta.url)
const source = readFileSync(new URL('../components/DocumentCenter/useDocumentCenter.ts', import.meta.url), 'utf8')
const { code } = transformSync(source, { loader: 'ts', format: 'cjs' })
const documentUrl = 'http://192.168.33.76:4313/s/9169ec06-15dd-4253-b132-415b264918fc'

// 只替换系统配置来源，状态、watch 和 computed 使用真实 Vue 实现。
function fixture(value) {
  const store = reactive({ systemInfo: { paths: { 'document-url': value } } })
  const locale = ref('zh')
  const command = { exports: {} }
  const commandSource = readFileSync(new URL('../../../jetlinks-web-core/src/hooks/useDocumentHelp.ts', import.meta.url), 'utf8')
  new Function('require', 'module', 'exports', transformSync(commandSource, { loader: 'ts', format: 'cjs' }).code)(require, command, command.exports)
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(
    id => {
      if (id === '@jetlinks-web-core/hooks/useDocumentHelp') return command.exports
      if (id === '@jetlinks-web-core/store/system') return { useSystemStore: () => store }
      if (id === '@jetlinks-web-core/locales') return { default: { global: { locale } }, __esModule: true }
      return require(id)
    },
    module, module.exports,
  )
  const scope = effectScope()
  const state = scope.run(() => module.exports.useDocumentCenter())
  return { store, state, locale, openDocument: module.exports.openDocument, stop: () => scope.stop() }
}

test('uses the configured shared document URL unchanged and reloads after reopening', () => {
  const { state, stop } = fixture(documentUrl)
  try {
    assert.equal(state.url.value, documentUrl)
    assert.equal(state.open.value, false)
    state.setOpen(true)
    assert.equal(state.loading.value, true)
    const key = state.frameKey.value
    state.onLoad()
    assert.equal(state.loading.value, false)
    state.setOpen(false)
    assert.equal(state.open.value, false)
    state.setOpen(true)
    assert.ok(state.frameKey.value > key)
    assert.equal(state.url.value, documentUrl)
  } finally { stop() }
})

test('missing and invalid configuration never navigates to an executable or relative URL', () => {
  for (const value of [undefined, '', '  ', {}, 'javascript:alert(1)', 'data:text/html,test', '/doc', 'bad-url']) {
    const { state, stop } = fixture(value)
    try {
      state.setOpen(true)
      assert.equal(state.url.value, '')
      assert.equal(state.loading.value, false)
      assert.equal(state.unavailable.value, typeof value === 'string' && value.trim() ? 'invalidUrl' : 'unconfigured')
    } finally { stop() }
  }
})

test('configuration refresh updates an open frame and a removed address clears loading', async () => {
  const { store, state, stop } = fixture(documentUrl)
  try {
    state.setOpen(true)
    state.onLoad()
    const key = state.frameKey.value
    store.systemInfo.paths['document-url'] = 'https://docs.example.com/guide'
    await nextTick()
    assert.equal(state.url.value, 'https://docs.example.com/guide')
    assert.ok(state.frameKey.value > key)
    assert.equal(state.loading.value, true)
    store.systemInfo.paths = {}
    await nextTick()
    assert.equal(state.url.value, '')
    assert.equal(state.loading.value, false)
  } finally { stop() }
})

test('load errors are retryable and closing stops the loading indicator', () => {
  const { state, stop } = fixture(documentUrl)
  try {
    state.setOpen(true)
    state.onError()
    assert.equal(state.failed.value, true)
    assert.equal(state.loading.value, false)
    const key = state.frameKey.value
    state.reload()
    assert.equal(state.failed.value, false)
    assert.equal(state.loading.value, true)
    assert.ok(state.frameKey.value > key)
    state.setOpen(false)
    assert.equal(state.loading.value, false)
  } finally { stop() }
})

test('module registration inserts docs after Language and preserves notices and user actions', () => {
  const moduleSource = readFileSync(new URL('../index.ts', import.meta.url), 'utf8')
    .replace("import.meta.glob('./views/**/index.vue')", '{}')
  const compiled = transformSync(moduleSource, { loader: 'ts', format: 'cjs' }).code
  const announcement = { targetPage: 'notification-detail', code: 'announcement' }
  const registration = { exports: {} }
  new Function('require', 'module', 'exports', compiled)(id => {
    if (id === 'vue') return require(id)
    if (id === './views/system/Announcement/register') return { getRegisterComponents: () => [announcement] }
    return {}
  }, registration, registration.exports)
  const actions = registration.exports.default.getRegisterComponents()
  assert.equal(actions[0], announcement)
  assert.equal(actions.some(item => item.targetModule === 'menuSearch'), false)
  const entry = actions.find(item => item.code === 'document-center')
  assert.equal(entry.targetPage, 'layout')
  assert.equal(entry.targetModule, 'headerRight')

  const mergeSource = readFileSync(new URL('../../../jetlinks-web-core/src/hooks/useRegistryComponentsMerge.ts', import.meta.url), 'utf8')
  const merge = { exports: {} }
  new Function('require', 'module', 'exports', transformSync(mergeSource, { loader: 'ts', format: 'cjs' }).code)(
    id => id === 'vue' ? require(id) : {}, merge, merge.exports,
  )
  const original = ['resource', 'Language', 'notice', 'user'].map(key => h('span', { key }))
  const merged = merge.exports.useRegistryVNodeMerge(() => original, () => [entry]).value
  assert.deepEqual(merged.map(node => node.key), ['resource', 'Language', 'document-center:Language', 'notice', 'user'])
})


test('opens a result in the shared frame while keeping the full center footer target', async () => {
  const { state, openDocument, stop } = fixture(documentUrl)
  try {
    const article = `${documentUrl}/doc/device-guide`
    openDocument(article)
    await nextTick()
    assert.equal(state.open.value, true)
    assert.equal(state.frameUrl.value, `${article}?embed=1&language=zh-CN`)
    assert.equal(state.url.value, documentUrl)
    openDocument('https://untrusted.example/doc/other')
    await nextTick()
    assert.equal(state.frameUrl.value, `${article}?embed=1&language=zh-CN`)
    state.setOpen(false)
    state.setOpen(true)
    assert.equal(state.frameUrl.value, `${documentUrl}?embed=1&language=zh-CN`)
  } finally { stop() }
})


test('embed parameters preserve existing query and fragment and follow platform locale without version', async () => {
  const configured = `${documentUrl}?source=platform&embed=0&language=en&version=2.20.0-SNAPSHOT#intro`
  const { state, locale, stop } = fixture(configured)
  try {
    state.setOpen(true)
    let target = new URL(state.frameUrl.value)
    assert.equal(target.searchParams.get('source'), 'platform')
    assert.equal(target.searchParams.get('embed'), '1')
    assert.equal(target.searchParams.get('language'), 'zh-CN')
    assert.equal(target.searchParams.has('version'), false)
    assert.equal(target.hash, '#intro')
    assert.equal(state.url.value, configured)
    locale.value = 'en'; await nextTick()
    assert.equal(new URL(state.frameUrl.value).searchParams.get('language'), 'en-US')
    locale.value = 'ja'; await nextTick()
    assert.equal(new URL(state.frameUrl.value).searchParams.get('language'), 'ja-JP')
    state.reload()
    assert.equal(new URL(state.frameUrl.value).searchParams.has('version'), false)
  } finally { stop() }
})


test('article-configured center opens sibling search results but rejects other shares', async () => {
  const center = 'https://docs.example.com/jetlinks/share-id'
  const { state, openDocument, stop } = fixture(`${center}/doc/home?source=platform`)
  try {
    openDocument(`${center}/doc/device?version=old`)
    await nextTick()
    assert.equal(state.frameUrl.value, `${center}/doc/device?embed=1&language=zh-CN`)
    for (const rejected of ['https://other.example.com/jetlinks/share-id/doc/other',
      'https://docs.example.com/jetlinks/other-share/doc/other', `${center}/doc/device/extra`]) {
      openDocument(rejected); await nextTick()
      assert.equal(state.frameUrl.value, `${center}/doc/device?embed=1&language=zh-CN`)
    }
  } finally { stop() }
})


test('feature help opens a relative article through the shared command and can reopen it', async () => {
  const center = 'https://docs.example.com/jetlinks/share-id'
  const { state, openDocument, stop } = fixture(`${center}/doc/home`)
  try {
    openDocument('/doc/device#connect'); await nextTick()
    assert.equal(state.open.value, true)
    assert.equal(state.frameUrl.value, `${center}/doc/device?embed=1&language=zh-CN#connect`)
    state.setOpen(false)
    openDocument('/doc/device#connect'); await nextTick()
    assert.equal(state.open.value, true)
    const expected = state.frameUrl.value
    for (const invalid of ['/doc/../outside', '//other.example.com/doc/device', '/doc/%2e%2e', 'javascript:alert(1)']) {
      openDocument(invalid); await nextTick()
      assert.equal(state.frameUrl.value, expected)
    }
  } finally { stop() }
})
