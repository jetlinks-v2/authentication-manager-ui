import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { build } from 'esbuild'
import { Form } from 'ant-design-vue'
import { createRenderer, h, nextTick, reactive } from 'vue'
import { compileScript, parse } from 'vue/compiler-sfc'

const moduleRoot = fileURLToPath(new URL('..', import.meta.url))
const { outputFiles } = await build({
  entryPoints: [new URL('../views/system/ThirdPartyLogin/components/ConfigDrawer.vue', import.meta.url).pathname],
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{
    name: 'login-drawer-boundaries',
    setup(plugin) {
      plugin.onResolve({ filter: /^vue$/ }, () => ({ path: import.meta.resolve('vue'), external: true }))
      plugin.onLoad({ filter: /\.vue$/ }, async ({ path }) => {
        const { descriptor } = parse(await readFile(path, 'utf8'), { filename: path })
        return { contents: compileScript(descriptor, { id: path, inlineTemplate: true }).content, loader: 'ts', resolveDir: dirname(path) }
      })
      plugin.onResolve({ filter: /^@jetlinks-web-core\/utils\/validate$/ }, () => ({
        path: fileURLToPath(new URL('../../../jetlinks-web-core/src/utils/validate.ts', import.meta.url)),
      }))
      plugin.onResolve({ filter: /^(vue-i18n|ant-design-vue|@jetlinks-web-core\/locales|@jetlinks-web-core\/api\/comm|\.\.\/methodIcons)$/ }, args => ({ path: args.path, namespace: 'fixture' }))
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({
        contents: path === 'vue-i18n' ? 'export const useI18n = () => ({ t: key => key })'
          : path === '@jetlinks-web-core/locales' ? 'export default { global: { t: key => key } }'
          : path === 'ant-design-vue' ? 'export const message = { success() {}, error() {} }'
            : path === '../methodIcons' ? 'export const methodIcons = {}'
              : 'export const fileUpload = () => { throw new Error("Unexpected upload") }',
        resolveDir: moduleRoot,
      }))
    },
  }],
})
const { default: Drawer } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`)

const node = tag => ({ tag, children: [], props: {} })
const renderer = createRenderer({
  createElement: node,
  createText: text => ({ ...node('#text'), text }),
  createComment: text => ({ ...node('#comment'), text }),
  insert(child, parent, anchor) {
    if (child.parent) {
      const siblings = child.parent.children
      siblings.splice(siblings.indexOf(child), 1)
    }
    child.parent = parent
    const index = anchor ? parent.children.indexOf(anchor) : -1
    parent.children.splice(index < 0 ? parent.children.length : index, 0, child)
  },
  remove(child) {
    const siblings = child.parent?.children
    if (siblings) siblings.splice(siblings.indexOf(child), 1)
  },
  setText(element, text) { element.text = text },
  setElementText(element, text) { element.text = text },
  patchProp(element, key, _, value) { element.props[key] = value },
  parentNode: element => element.parent,
  nextSibling(element) {
    const siblings = element.parent?.children || []
    return siblings[siblings.indexOf(element) + 1] || null
  },
})
const walk = root => [root, ...root.children.flatMap(walk)]
const textOf = root => (root.text || '') + root.children.map(textOf).join('')
const settle = async () => { await new Promise(setImmediate); await nextTick() }

async function mount(t, editing) {
  const previousWindow = globalThis.window
  // Ant Form uses responsive breakpoints; validation and field registration remain real.
  globalThis.window = { matchMedia: () => ({ matches: false, addListener() {}, removeListener() {} }) }
  const props = reactive({ open: false, method: 'wechat', editing })
  const saves = []
  const app = renderer.createApp({ setup: () => () => h(Drawer, {
    ...props, onSave: draft => saves.push(JSON.parse(JSON.stringify(draft))),
    'onUpdate:open': open => { props.open = open },
  }) })
  app.config.globalProperties.$t = key => key
  app.component('a-form', Form)
  // Keep Ant's real registration/validation; omit DOM-only error animations in this renderer.
  app.component('a-form-item', {
    inheritAttrs: false,
    setup: (_, { attrs, slots }) => () => h('div', { 'data-field': attrs.name }, [
      h(Form.Item, { ...attrs, noStyle: true }, slots),
    ]),
  })
  app.component('JlDrawerShell', {
    props: ['open'], setup: (p, { slots }) => () => p.open ? h('section', [slots.default?.(), slots.foot?.()]) : null,
  })
  for (const name of ['StickyActionBar', 'a-upload', 'a-radio-button', 'a-row', 'a-col']) {
    app.component(name, { setup: (_, { slots }) => () => h('div', slots.default?.()) })
  }
  for (const name of ['a-input', 'a-input-password', 'a-switch', 'a-select', 'a-radio-group', 'form-item-role', 'form-item-org']) {
    app.component(name, {
      props: ['value', 'checked'], emits: ['update:value', 'update:checked'],
      setup: (p, { emit, attrs, slots }) => () => h(name, {
        ...attrs, value: p.value, checked: p.checked,
        setValue: value => emit('update:value', value),
        setChecked: value => emit('update:checked', value),
      }, slots.default?.()),
    })
  }
  app.component('a-button', { setup: (_, { attrs, slots }) => () => h('button', attrs, slots.default?.()) })
  const root = node('root')
  app.mount(root)
  t.after(() => { app.unmount(); globalThis.window = previousWindow })
  props.open = true
  await settle()
  const find = predicate => walk(root).find(predicate)
  const byTag = tag => find(item => item.tag === tag)
  const button = key => find(item => item.tag === 'button' && textOf(item) === key)
  return {
    root, props, saves, find, byTag,
    password: () => find(item => item.props.placeholder === 'ThirdPartyLogin.defaultPasswdPlaceholder'),
    async setAutoCreate(value) {
      const field = find(item => item.props['data-field'] === 'autoCreateUser')
      assert.ok(field, 'auto-create must be rendered')
      const control = walk(field).find(item => item.tag === 'a-switch')
      control.props.setChecked(value)
      await settle()
    },
    async save() { await button('ThirdPartyLogin.save').props.onClick(); await settle() },
    async cancel() { await button('ThirdPartyLogin.cancel').props.onClick(); await settle() },
  }
}

const existing = (overrides = {}) => ({
  id: 'existing', method: 'wechat', name: 'Example', appId: 'example-app', secret: 'app-secret-fixture',
  autoCreateUser: true, defaultPasswd: 'ExistingPass123', usernamePrefix: 'external-',
  roleIdList: ['role-1'], orgIdList: ['org-1'], ...overrides,
})

test('the real drawer blocks empty and invalid passwords, then submits the manually entered password', async t => {
  const form = await mount(t, existing({ defaultPasswd: '' }))
  for (const value of ['', '   ', 'short', 'alllowercase123', `Aa1${'x'.repeat(62)}`]) {
    const password = form.password()
    assert.ok(password, 'default password input must be rendered')
    password.props.setValue(value)
    await settle()
    await form.save()
    assert.equal(form.saves.length, 0, 'invalid password must not emit save')
  }
  form.password().props.setValue('ManualPass123!')
  await settle()
  await form.save()
  assert.equal(form.saves.length, 1)
  assert.equal(form.saves[0].defaultPasswd, 'ManualPass123!')
  assert.equal(form.saves[0].autoCreateUser, true)
})

test('turning off auto-create removes password and role validation without discarding existing settings', async t => {
  const form = await mount(t, existing({ defaultPasswd: '', roleIdList: [] }))
  await form.save()
  assert.equal(form.saves.length, 0)
  await form.setAutoCreate(false)
  assert.equal(form.password(), undefined)
  await form.save()
  assert.equal(form.saves.length, 1)
  assert.equal(form.saves[0].autoCreateUser, false)
  assert.equal(form.saves[0].defaultPasswd, '')
  assert.deepEqual(form.saves[0].orgIdList, ['org-1'])
  assert.equal(form.saves[0].usernamePrefix, 'external-')
  await form.setAutoCreate(true)
  await form.save()
  assert.equal(form.saves.length, 1, 'turning back on restores required validation')
})

test('existing password survives toggling, and cancelling discards edits before reopening', async t => {
  const form = await mount(t, existing())
  assert.equal(form.password().props.value, 'ExistingPass123')
  await form.setAutoCreate(false)
  await form.save()
  assert.equal(form.saves[0].defaultPasswd, 'ExistingPass123')
  assert.deepEqual(form.saves[0].roleIdList, ['role-1'])
  await form.setAutoCreate(true)
  form.password().props.setValue('UnsavedPass123')
  await settle()
  await form.cancel()
  form.props.open = true
  await settle()
  assert.equal(form.password().props.value, 'ExistingPass123')
})
