import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { transformSync } from 'esbuild'
import * as vue from 'vue'
import { compileScript, parse } from 'vue/compiler-sfc'

const require = createRequire(import.meta.url)
const antRequire = createRequire(require.resolve('ant-design-vue'))
const Schema = antRequire('async-validator').default
const root = resolve(import.meta.dirname, '../views/system/Menu/Detail/BasicInfo')
let io
const request = (method, data) => {
  io.requests.push({ method, data: JSON.parse(JSON.stringify(data)) })
  if (io.failure) return Promise.reject(io.failure)
  return Promise.resolve({ success: io.success, result: { id: data.id || 'created-menu' } })
}
const Info = vue.defineComponent({
  setup(_, { expose }) { expose({ onSave: async () => io.info }); return () => null },
})
const dependencies = {
  vue,
  'vue-router': { useRoute: () => ({ params: { id: ':id' } }) },
  'vue-i18n': { useI18n: () => ({ t: key => key }) },
  '@jetlinks-web/utils': { onlyMessage: (...args) => io.messages.push(args) },
  '@jetlinks-web-core/utils': { isNoCommunity: true },
  '@jetlinks-web-core/utils/consts': { OWNER_KEY: 'iot' },
  '@jetlinks-web-core/store/menu': { useMenuStore: () => ({ jumpPage: (...args) => io.jumps.push(args) }) },
  '@authentication-manager-ui/api/system/menu': {
    getMenuTree: async () => ({ result: [] }),
    getAssetsType: async () => ({ result: [{ id: 'device', name: '设备' }, { id: 'product', name: '产品' }] }),
    updateMenu: data => request('patch', data),
    addMenu: data => request('post', data),
  },
}

// Execute the real SFC setup, template and local mapper; replace only I/O and rendering controls.
const cache = new Map()
function load(filename) {
  if (cache.has(filename)) return cache.get(filename)
  let source = readFileSync(filename, 'utf8')
  if (filename.endsWith('.vue')) {
    source = compileScript(parse(source, { filename }).descriptor, { id: filename, inlineTemplate: true }).content
  }
  const { code } = transformSync(source, { loader: 'ts', format: 'cjs' })
  const module = { exports: {} }
  const imports = name => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name]
    if (name.endsWith('/PermissionChoose.vue')) return () => null
    if (name === './Info.vue') return Info
    if (name.startsWith('.')) return load(resolve(dirname(filename), /\.(vue|ts)$/.test(name) ? name : `${name}.ts`))
    return require(name)
  }
  const globals = { ...vue, ...dependencies['vue-router'] }
  new Function('require', 'module', 'exports', ...Object.keys(globals), code)(imports, module, module.exports, ...Object.values(globals))
  cache.set(filename, module.exports)
  return module.exports
}
const { createMenuPermissionForm, buildMenuPermissionPayload } = load(resolve(root, 'permissionForm.ts'))
const Permission = load(resolve(root, 'Permission.vue')).default
const BasicInfo = load(resolve(root, 'index.vue')).default

const formKey = Symbol('form')
const Form = vue.defineComponent({
  name: 'TestForm', props: ['model'],
  setup(props, { slots, expose }) {
    const fields = new Map()
    vue.provide(formKey, fields)
    expose({ validate: async () => {
      const rules = Object.fromEntries([...fields.values()].filter(field => field.rules).map(field => [field.name, field.rules]))
      await new Schema(rules).validate(props.model, { suppressWarning: true })
      return props.model
    } })
    return () => vue.h('div', slots.default?.())
  },
})
const FormItem = vue.defineComponent({
  props: ['name', 'rules'],
  setup(props, { slots }) {
    const fields = vue.inject(formKey)
    const key = Symbol()
    vue.onMounted(() => fields.set(key, props))
    vue.onUnmounted(() => fields.delete(key))
    return () => vue.h('div', slots.default?.())
  },
})
const control = name => vue.defineComponent({ name, setup: (_, { slots }) => () => vue.h('div', slots.default?.()) })
const renderer = vue.createRenderer({
  createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
  insert() {}, remove() {}, setText() {}, setElementText() {}, patchProp() {},
  parentNode: () => null, nextSibling: () => null,
})
const flush = async () => { await Promise.resolve(); await vue.nextTick() }

async function mount(component, value = {}) {
  io = { requests: [], messages: [], jumps: [], info: { name: 'menu' }, success: true, refreshes: 0 }
  const props = vue.reactive({ value })
  const api = vue.ref()
  const app = renderer.createApp({ setup: () => () => vue.h(component, {
    ...props, ref: api, onRefresh: () => io.refreshes++,
  }) })
  app.config.globalProperties.$t = key => key
  app.component('a-form', Form)
  app.component('a-form-item', FormItem)
  for (const name of ['a-select', 'a-tree-select', 'a-radio-group', 'a-radio', 'a-tooltip', 'AIcon', 'TitleComponent', 'j-permission-button']) {
    app.component(name, control(name))
  }
  app.mount({})
  await flush()
  const find = name => {
    const visit = node => {
      if (!node) return undefined
      if (node.type?.name === name) return node
      return visit(node.component?.subTree) || (Array.isArray(node.children) ? node.children.map(visit).find(Boolean) : undefined)
    }
    const node = visit(app._instance.subTree)
    assert.ok(node, `Expected mounted ${name}`)
    return node
  }
  return { props, api: api.value, find, stop: () => app.unmount() }
}
const supported = fields => ({ accessSupport: { value: 'support' }, ...fields })

test('legacy scalar menus open with either string or enum accessSupport without mutating the input', () => {
  for (const accessSupport of ['support', { value: 'support' }]) {
    for (const assetTypes of [undefined, null, []]) {
      const source = { accessSupport, assetType: 'device', assetTypes, permissions: [{ permission: 'device', actions: ['query'] }] }
      const form = createMenuPermissionForm(source)
      assert.equal(form.accessSupport, 'support')
      assert.deepEqual(form.assetTypes, ['device'])
      form.permissions[0].actions.push('save')
      assert.deepEqual(source.permissions[0].actions, ['query'])
    }
  }
})

test('new arrays take precedence over stale scalars, deduplicate and retain unavailable asset IDs', () => {
  const form = createMenuPermissionForm(supported({ assetTypes: ['device', 'device', 'retired', '', '  ', null], assetType: 'product' }))
  assert.deepEqual(form.assetTypes, ['device', 'retired'])
  assert.deepEqual(createMenuPermissionForm(supported({ assetTypes: [''], assetType: 'product' })).assetTypes, [])
  assert.deepEqual(createMenuPermissionForm().assetTypes, [])
})

test('wire payload mirrors a single type but explicitly clears the legacy field for multiple or no types', () => {
  const form = createMenuPermissionForm(supported({ assetType: 'device' }))
  assert.equal(buildMenuPermissionPayload(form).assetType, 'device')
  form.assetTypes.push('product')
  const multiple = JSON.parse(JSON.stringify(buildMenuPermissionPayload(form)))
  assert.deepEqual(multiple.assetTypes, ['device', 'product'])
  assert.equal(multiple.assetType, '')
  form.assetTypes = []
  assert.deepEqual(buildMenuPermissionPayload(form).assetTypes, [])
  assert.equal(buildMenuPermissionPayload(form).assetType, '')
  for (const accessSupport of ['indirect', 'unsupported']) {
    form.accessSupport = accessSupport
    form.assetTypes = ['device', 'product']
    form.indirectMenus = ['related']
    const payload = buildMenuPermissionPayload(form)
    assert.deepEqual(payload.assetTypes, [])
    assert.equal(payload.assetType, '')
    assert.deepEqual(payload.indirectMenus, accessSupport === 'indirect' ? ['related'] : [])
  }
})

test('the rendered select submits multiple values and retains IDs absent from the current catalog', async t => {
  const page = await mount(Permission, supported({ assetType: 'retired' }))
  t.after(page.stop)
  const select = page.find('a-select')
  assert.equal(select.props.mode, 'multiple')
  assert.deepEqual([...select.props.value], ['retired'])
  select.props['onUpdate:value'](['retired', 'device'])
  const payload = await page.api.onSave()
  assert.deepEqual(payload.assetTypes, ['retired', 'device'])
  assert.equal(payload.assetType, '')
})

test('real array validation rejects empty and scalar values instead of falling back to the old scalar', async t => {
  const page = await mount(Permission, supported({ assetType: 'device' }))
  t.after(page.stop)
  page.find('a-select').props['onUpdate:value']([])
  await assert.rejects(page.api.onSave(), error => error.fields.assetTypes.length > 0)
  page.find('a-select').props['onUpdate:value']('device')
  await assert.rejects(page.api.onSave(), error => error.fields.assetTypes.length > 0)
  page.find('a-select').props['onUpdate:value'](['product'])
  assert.equal((await page.api.onSave()).assetType, 'product')
})

test('switching modes clears stale selections and only submits fields for the active mode', async t => {
  const page = await mount(Permission, supported({ assetTypes: ['device', 'product'], indirectMenus: ['old'] }))
  t.after(page.stop)
  const mode = async value => {
    const radio = page.find('a-radio-group')
    radio.props['onUpdate:value'](value)
    radio.props.onChange()
    await flush()
  }
  await mode('indirect')
  assert.deepEqual([...page.find('a-tree-select').props.value], [])
  page.find('a-tree-select').props['onUpdate:value'](['related'])
  let payload = await page.api.onSave()
  assert.deepEqual(payload.assetTypes, [])
  assert.equal(payload.assetType, '')
  assert.deepEqual(payload.indirectMenus, ['related'])
  await mode('unsupported')
  payload = await page.api.onSave()
  assert.deepEqual(payload.indirectMenus, [])
  assert.deepEqual(payload.assetTypes, [])
  assert.equal(payload.assetType, '')
  await mode('support')
  assert.deepEqual([...page.find('a-select').props.value], [])
  await assert.rejects(page.api.onSave())
})

test('reusing the form for a legacy menu or a new menu resets the previous menu fields', async t => {
  const page = await mount(Permission, supported({ id: 'new', assetTypes: ['device', 'product'] }))
  t.after(page.stop)
  page.props.value = supported({ id: 'old', assetType: 'retired' })
  await flush()
  assert.deepEqual([...page.find('a-select').props.value], ['retired'])
  page.props.value = {}
  await flush()
  const payload = await page.api.onSave()
  assert.equal(payload.id, undefined)
  assert.equal(payload.accessSupport, 'unsupported')
  assert.deepEqual(payload.assetTypes, [])
  assert.deepEqual(payload.indirectMenus, [])
})

test('editing sends the new selections through PATCH and refreshes the detail used by other tabs', async t => {
  const page = await mount(BasicInfo, supported({ id: 'existing', assetType: 'old', options: { retained: true } }))
  t.after(page.stop)
  io.info = { name: 'edited', assetType: 'stale', assetTypes: ['stale'] }
  page.find('a-select').props['onUpdate:value'](['device', 'product'])
  await page.find('j-permission-button').props.onClick()
  const [{ method, data }] = io.requests
  assert.equal(method, 'patch')
  assert.deepEqual(data.assetTypes, ['device', 'product'])
  assert.equal(data.assetType, '')
  assert.equal(data.name, 'edited')
  assert.deepEqual(data.options, { retained: true })
  assert.equal(io.refreshes, 1)
})

test('creating uses POST with an array; failed validation and unsuccessful saves do not refresh', async t => {
  const page = await mount(BasicInfo, { accessSupport: 'support' })
  t.after(page.stop)
  await assert.rejects(page.find('j-permission-button').props.onClick())
  assert.equal(io.requests.length, 0)
  page.find('a-select').props['onUpdate:value'](['device'])
  io.success = false
  await page.find('j-permission-button').props.onClick()
  assert.equal(io.refreshes, 0)
  assert.equal(io.jumps.length, 0)
  assert.deepEqual([...page.find('a-select').props.value], ['device'])
  io.success = true
  await page.find('j-permission-button').props.onClick()
  assert.equal(io.requests[1].method, 'post')
  assert.deepEqual(io.requests[1].data.assetTypes, ['device'])
  assert.equal(io.requests[1].data.assetType, 'device')
  assert.equal(io.jumps[0][1].params.id, 'created-menu')
})

test('failed edits preserve the selected draft and do not refresh until a successful retry', async t => {
  const page = await mount(BasicInfo, supported({ id: 'existing', assetType: 'old' }))
  t.after(page.stop)
  page.find('a-select').props['onUpdate:value'](['device', 'product'])
  io.success = false
  await page.find('j-permission-button').props.onClick()
  assert.equal(io.refreshes, 0)
  io.failure = new Error('offline')
  await assert.rejects(page.find('j-permission-button').props.onClick(), /offline/)
  assert.equal(io.refreshes, 0)
  assert.deepEqual([...page.find('a-select').props.value], ['device', 'product'])
  io.failure = undefined
  io.success = true
  await page.find('j-permission-button').props.onClick()
  assert.equal(io.refreshes, 1)
  assert.deepEqual(io.requests[2].data.assetTypes, ['device', 'product'])
})
