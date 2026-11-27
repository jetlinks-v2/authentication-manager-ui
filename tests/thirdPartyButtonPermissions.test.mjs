import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { computed, reactive, ref } from 'vue'
import { compileScript, compileTemplate, parse } from 'vue/compiler-sfc'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
function load(path, imports = {}) {
  const js = ts.transpileModule(read(path), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', js)(id => {
    assert.ok(id in imports, `Unexpected dependency: ${id}`)
    return imports[id]
  }, module, module.exports)
  return module.exports
}

const kinds = [
  { key: 'direct', permission: 'application-center/ThirdPartyApplication',
    hook: '../views/application-center/ThirdPartyApplication/Direct/useDirectApplications.ts',
    page: '../views/application-center/ThirdPartyApplication/Direct/List.vue' },
  { key: 'login', permission: 'system/ThirdPartyLogin',
    hook: '../views/system/ThirdPartyLogin/useThirdPartyLogin.ts',
    page: '../views/system/ThirdPartyLogin/index.vue' },
]
const model = load('../views/system/ThirdPartyLogin/model.ts', {
  '@jetlinks-web-core/locales': { default: { global: { t: key => key } } },
})
const application = { id: 'app-1', name: 'Example', provider: 'wechat-official-account',
  state: 'disabled', integrationModes: ['sso'], sso: { configuration: { appId: 'example' } } }

function fixture(kind, buttons = []) {
  const grants = ref(buttons.map(button => `${kind.permission}:${button}`))
  const calls = []
  let resolveDetail
  const api = (name, result = {}) => async (...args) => { calls.push([name, ...args]); return { result } }
  const imports = {
    vue: { computed, reactive, ref, onMounted() {}, onBeforeUnmount() {} },
    'vue-i18n': { useI18n: () => ({ t: key => key }) },
    '@jetlinks-web/utils': { onlyMessage() {} },
    '@jetlinks-web-core/store/menu': { useMenuStore: () => ({ jumpPage() {} }) },
    '@jetlinks-web-core/store/auth': { useAuthStore: () => ({ hasPermission: key => grants.value.includes(key) }) },
    '@authentication-manager-ui/api/application-center/apiApplication': {
      queryApiApplications: api('query', { data: [] }),
      updateApiApplication: api('update'), deleteApiApplication: api('delete'),
    },
    '@authentication-manager-ui/api/application-center/directApiApplication': { createDirectApplication: api('create') },
    '../applicationUtils': load('../views/application-center/ThirdPartyApplication/applicationUtils.ts'),
    '@authentication-manager-ui/api/system/thirdPartyLogin': {
      createThirdPartyApplication: api('create'), updateThirdPartyApplication: api('update'),
      deleteThirdPartyApplication: api('delete'), updateThirdPartyApplicationState: api('toggle'),
      queryThirdPartyApplications: api('query', { data: [] }), getSystemPaths: api('paths'),
      getThirdPartyApplication: async () => {
        calls.push(['detail'])
        return resolveDetail ? resolveDetail() : { result: application }
      },
    },
    './model': model,
  }
  const exported = load(kind.hook, imports)
  const state = kind.key === 'direct' ? exported.useDirectApplications() : exported.useThirdPartyLogin()
  const record = kind.key === 'direct' ? application : model.fromApplication(application, true)
  assert.ok(record)
  return {
    ...state, grants, calls, record,
    edit: () => state.openEdit(record),
    opened: () => kind.key === 'direct' ? state.formOpen.value : state.drawerOpen.value,
    saveRecord: () => {
      if (kind.key === 'direct') { state.form.name = 'Example'; return state.saveForm() }
      return state.save({ ...model.createDraft('wechat'), name: 'Example', appId: 'example' })
    },
    toggle: () => kind.key === 'direct' ? state.toggleState(record) : state.updateEnabled(record.id, true),
    deleteRecord: () => kind.key === 'direct' ? state.removeApplication(record) : state.remove(record),
    delayDetail: value => { resolveDetail = value },
  }
}

for (const kind of kinds) {
  test(`${kind.key}: read-only and unrelated grants cannot open or submit write actions`, async () => {
    for (const buttons of [[], ['query'], ['add', 'update'], ['view']]) {
      const f = fixture(kind, buttons)
      f.grants.value.push(`${kinds.find(other => other !== kind).permission}:save`, 'application:save')
      f.openCreate()
      await f.edit()
      assert.equal(f.opened(), false)
      assert.equal(await f.saveRecord(), false)
      assert.equal(await f.toggle(), false)
      assert.equal(await f.deleteRecord(), false)
      assert.deepEqual(f.calls, [])
    }
  })

  test(`${kind.key}: save authorizes creation, editing and status but cannot delete`, async () => {
    const f = fixture(kind, ['save'])
    f.openCreate()
    assert.equal(f.opened(), true)
    assert.equal(await f.saveRecord(), true)
    await f.edit()
    assert.equal(f.opened(), true)
    assert.equal(await f.saveRecord(), true)
    assert.equal(await f.toggle(), true)
    assert.equal(await f.deleteRecord(), false)
    assert.deepEqual(f.calls.filter(([name]) => !['query', 'detail'].includes(name)).map(([name]) => name),
      ['create', 'update', kind.key === 'direct' ? 'update' : 'toggle'])
  })

  test(`${kind.key}: delete-only grant preserves disabled-only deletion`, async () => {
    const f = fixture(kind, ['delete'])
    f.openCreate()
    await f.edit()
    assert.equal(f.opened(), false)
    assert.equal(await f.saveRecord(), false)
    assert.equal(await f.toggle(), false)
    if (kind.key === 'direct') f.record.state = 'enabled'
    else f.record.enabled = true
    assert.equal(await f.deleteRecord(), false)
    assert.deepEqual(f.calls, [])
    if (kind.key === 'direct') f.record.state = 'disabled'
    else f.record.enabled = false
    assert.equal(await f.deleteRecord(), true)
    assert.equal(f.calls.filter(([name]) => name === 'delete').length, 1)
  })

  test(`${kind.key}: revoking grants blocks callbacks retained from an open editor`, async () => {
    const f = fixture(kind, ['save', 'delete'])
    f.openCreate()
    assert.equal(f.opened(), true)
    f.grants.value = []
    assert.equal(f.canSave.value, false)
    assert.equal(f.canDelete.value, false)
    assert.equal(await f.saveRecord(), false)
    assert.equal(await f.toggle(), false)
    assert.equal(await f.deleteRecord(), false)
    assert.deepEqual(f.calls, [])
    f.grants.value = [`${kind.permission}:save`]
    assert.equal(await f.saveRecord(), true)
  })

  test(`${kind.key}: actual page compiles and every create/edit/delete button carries a menu grant`, () => {
    const page = read(kind.page)
    const { descriptor, errors } = parse(page, { filename: kind.page })
    assert.deepEqual(errors, [])
    const script = compileScript(descriptor, { id: kind.key })
    const template = compileTemplate({ source: descriptor.template.content, filename: kind.page,
      id: kind.key, compilerOptions: { bindingMetadata: script.bindings } })
    assert.deepEqual(template.errors, [])
    const buttons = [...page.matchAll(/<j-permission-button\b([\s\S]*?)<\/j-permission-button>/g)]
    assert.equal(buttons.length, 4)
    for (const [, button] of buttons) assert.match(button, /:hasPermission="permission \+ ':(save|delete)'"/)
    assert.doesNotMatch(page, /:hasPermission="true"|<a-button[^>]*@click="openCreate"/)
  })
}

test('login: revoking save during detail loading cannot open the editor', async () => {
  const f = fixture(kinds[1], ['save'])
  let finish
  f.delayDetail(() => new Promise(resolve => { finish = resolve }))
  const pending = f.edit()
  f.grants.value = []
  finish({ result: application })
  await pending
  assert.equal(f.opened(), false)
  assert.equal(f.editing.value, undefined)
})
