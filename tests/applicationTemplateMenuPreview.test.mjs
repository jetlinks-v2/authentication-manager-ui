import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { coreI18nPlugin } from '../../../jetlinks-web-core/tests/helpers/coreI18nPlugin.mjs'

const { outputFiles } = await build({
  stdin: {
    contents: `
      export { buildTemplatePreviewMenus } from './views/application-center/ProjectApplication/Create/templatePreviewModel';
      export { useTemplatePreview } from './views/application-center/ProjectApplication/Create/useTemplatePreview';
      export { ref, effectScope, nextTick } from 'vue';
      export { api } from '@authentication-manager-ui/api/application-center/applicationTemplate';
    `,
    resolveDir: fileURLToPath(new URL('..', import.meta.url)),
  },
  bundle: true,
  write: false,
  format: 'esm',
  plugins: [coreI18nPlugin(), {
    name: 'application-template-preview-boundaries',
    setup(plugin) {
      plugin.onResolve({ filter: /^vue$/ }, () => ({ path: import.meta.resolve('vue'), external: true }))
      plugin.onResolve({ filter: /^@authentication-manager-ui\/api\/application-center\/(applicationTemplate|businessApplication)$/ }, () => ({ path: 'api', namespace: 'fixture' }))
      plugin.onLoad({ filter: /^api$/, namespace: 'fixture' }, () => ({ contents: `
        export const api = { document: async id => ({ result: { id, document: '' } }), menus: async () => ({ result: { menus: [] } }) };
        export const getApplicationTemplate = id => api.document(id);
        export const getBusinessApplicationTemplateMenus = id => api.menus(id);
      ` }))
      plugin.onResolve({ filter: /^(dayjs|@jetlinks-web-core\/layout\/runtime\/layoutVariant)$/ }, args => ({ path: args.path, namespace: 'fixture' }))
      plugin.onLoad({ filter: /^dayjs$/, namespace: 'fixture' }, () => ({ contents: `export default () => ({ format: () => '' })` }))
      plugin.onLoad({ filter: /layoutVariant$/, namespace: 'fixture' }, () => ({ contents: `export const normalizeBasicLayoutVariant = value => value` }))
    },
  }],
})
const { buildTemplatePreviewMenus, useTemplatePreview, api, effectScope, ref, nextTick } = await import(
  `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`,
)

test('keeps hierarchy, translated names and duplicate titles with different IDs', () => {
  assert.deepEqual(buildTemplatePreviewMenus([
    { id: 'root', name: '设备管理', children: [{ id: 'a', name: '详情', i18nName: '设备详情' }] },
    { id: 'b', parentId: 'root', name: '设备详情' },
  ]), [{ key: 'root', title: '设备管理', buttons: [], children: [
    { key: 'a', title: '设备详情', buttons: [], children: [] },
    { key: 'b', title: '设备详情', buttons: [], children: [] },
  ] }])
})

test('keeps ancestor paths, omits ungranted leaves and does not alter the response', () => {
  const menus = [
    { id: 'root', name: '资源', granted: false, children: [
      { id: 'kept', name: '设备', granted: true },
      { id: 'hidden', name: '未授予', granted: false },
    ] },
    { id: 'none', name: '未选择', granted: false },
  ]
  const original = structuredClone(menus)
  assert.deepEqual(buildTemplatePreviewMenus(menus), [{
    key: 'root', title: '资源', buttons: [], children: [{ key: 'kept', title: '设备', buttons: [], children: [] }],
  }])
  assert.deepEqual(menus, original)
  assert.deepEqual(buildTemplatePreviewMenus([]), [])
})

test('keeps granted buttons under their own menus with localized names and ID fallback', () => {
  const menus = [{
    id: 'root', name: '资源', buttons: [
      { id: 'query', name: '查询', i18nName: '查看资源', granted: true },
      { id: 'delete', name: '删除', granted: false },
    ], children: [{
      id: 'child', name: '设备', buttons: [
        { id: 'query', name: '查看设备' },
        { id: 'export' },
        { id: 'update', name: '编辑', granted: 'false' },
      ],
    }],
  }]
  const original = structuredClone(menus)
  assert.deepEqual(buildTemplatePreviewMenus(menus), [{
    key: 'root', title: '资源', buttons: [{ key: 'query', title: '查看资源' }], children: [{
      key: 'child', title: '设备', children: [], buttons: [
        { key: 'query', title: '查看设备' },
        { key: 'export', title: 'export' },
      ],
    }],
  }])
  assert.deepEqual(menus, original)
})

test('supports legacy actions and grant flags without exposing buttons on ungranted ancestors', () => {
  assert.deepEqual(buildTemplatePreviewMenus([
    { id: 'path', name: '目录', granted: false, buttons: [{ id: 'manage', granted: true }] },
    { id: 'child', parentId: 'path', name: '子菜单', actions: [
      { id: 'query', name: '查询', checked: true },
      { id: 'delete', name: '删除', enabled: false },
      { id: 'update', name: '编辑', selected: false },
      { id: 'export', name: '导出', granted: 0 },
    ] },
    { id: 'standalone', name: '独立菜单', actions: [{ id: 'query', name: '查看' }] },
    { id: 'hidden', granted: false, buttons: [{ id: 'query', granted: true }] },
  ]), [
    { key: 'path', title: '目录', buttons: [], children: [{
      key: 'child', title: '子菜单', buttons: [{ key: 'query', title: '查询' }], children: [],
    }] },
    { key: 'standalone', title: '独立菜单', buttons: [{ key: 'query', title: '查看' }], children: [] },
  ])
})

function fixture(t) {
  api.document = async id => ({ result: { id, document: '' } })
  api.menus = async () => ({ result: { menus: [] } })
  const scope = effectScope()
  const open = ref(true)
  const state = scope.run(() => useTemplatePreview(() => open.value))
  t.after(() => scope.stop())
  return { state, open }
}
const template = id => ({ id, name: id, disabled: false })
const flush = async () => { await new Promise(resolve => setImmediate(resolve)); await nextTick() }
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

test('loads localized documentation and menus independently, with raw document fallback', async t => {
  const { state } = fixture(t)
  api.document = async id => ({ result: { id, document: '原文', i18nDocument: '译文' } })
  api.menus = async () => ({ result: { menus: [{ id: 'menu', name: '菜单', buttons: [{ id: 'query', name: '查询' }] }] } })
  state.openPreview(template('one'))
  assert.equal(state.preview.documentLoading, true)
  assert.equal(state.preview.menusLoading, true)
  await flush()
  assert.equal(state.preview.document, '译文')
  assert.equal(state.preview.menus[0].title, '菜单')
  assert.deepEqual(state.preview.menus[0].buttons, [{ key: 'query', title: '查询' }])
  api.document = async id => ({ result: { id, document: '原文' } })
  await state.loadPreviewDocument()
  assert.equal(state.preview.document, '原文')
})

test('distinguishes failed and malformed responses from empty content, and supports retry', async t => {
  const { state } = fixture(t)
  api.document = async () => { throw new Error('offline') }
  api.menus = async () => ({ success: false, result: { menus: [] } })
  state.openPreview(template('one'))
  await flush()
  assert.equal(state.preview.documentError, true)
  assert.equal(state.preview.menusError, true)
  api.document = async id => ({ result: { id, document: '' } })
  api.menus = async () => ({ result: { menus: [] } })
  await Promise.all([state.loadPreviewDocument(), state.loadPreviewMenus()])
  assert.equal(state.preview.documentError, false)
  assert.equal(state.preview.document, '')
  assert.equal(state.preview.menusError, false)
  assert.deepEqual(state.preview.menus, [])
  api.menus = async () => ({ result: {} })
  await state.loadPreviewMenus()
  assert.equal(state.preview.menusError, true)
})

test('late responses from the previous template cannot replace the active preview', async t => {
  const { state } = fixture(t)
  const documentA = deferred(), menusA = deferred()
  api.document = id => id === 'a' ? documentA.promise : Promise.resolve({ result: { id, document: 'B' } })
  api.menus = id => id === 'a' ? menusA.promise : Promise.resolve({ result: { menus: [{ id: 'b', name: 'B' }] } })
  state.openPreview(template('a'))
  state.openPreview(template('b'))
  await flush()
  documentA.resolve({ result: { id: 'a', document: 'A' } })
  menusA.reject(new Error('late failure'))
  await flush()
  assert.equal(state.preview.template.id, 'b')
  assert.equal(state.preview.document, 'B')
  assert.equal(state.preview.menus[0].key, 'b')
  assert.equal(state.preview.menusError, false)
})

test('closing the host invalidates in-flight work; reopening starts on documentation', async t => {
  const { state, open } = fixture(t)
  const response = deferred()
  api.document = () => response.promise
  state.openPreview(template('one'))
  state.preview.activeTab = 'menus'
  open.value = false
  await nextTick()
  response.resolve({ result: { id: 'one', document: 'late' } })
  await flush()
  assert.equal(state.preview.template, undefined)
  assert.equal(state.preview.document, '')
  assert.equal(state.preview.documentLoading, false)
  open.value = true
  state.openPreview(template('two'))
  assert.equal(state.preview.activeTab, 'document')
})
