import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { compile, computed, createSSRApp, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const source = read('../views/application-center/Template/useApplicationTemplateList.ts')
const page = read('../views/application-center/Template/index.vue')
const grant = 'application-center/Template:update'

function fixture(initialGrants = []) {
  const grants = ref(initialGrants)
  const calls = []
  const imports = {
    vue: { computed, ref },
    'ant-design-vue': { Modal: {} },
    'vue-i18n': { useI18n: () => ({ t: key => key }) },
    '@jetlinks-web-core/store/menu': { useMenuStore: () => ({ jumpPage: (...args) => calls.push(args) }) },
    '@jetlinks-web-core/store/auth': { useAuthStore: () => ({ hasPermission: key => grants.value.includes(key) }) },
    '@jetlinks-web/utils': { onlyMessage() {} },
    '@authentication-manager-ui/api/application-center/applicationTemplate': {},
  }
  const js = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', js)(id => {
    assert.ok(id in imports, `Unexpected dependency: ${id}`)
    return imports[id]
  }, module, module.exports)
  return { ...module.exports.useApplicationTemplateList(), grants, calls }
}

test('query, create, delete and status grants cannot replace template edit permission', () => {
  for (const grants of [[], ['business-application-template:save'],
    ...['view', 'add', 'delete', 'action'].map(action => [`application-center/Template:${action}`])]) {
    const f = fixture(grants)
    assert.equal(f.canEdit?.value, false, JSON.stringify(grants))
    f.table.viewDetail({ id: 'template-1' })
    assert.deepEqual(f.calls, [], JSON.stringify(grants))
  }
})

test('edit permission preserves the detail route and template ID', () => {
  const f = fixture([grant])
  assert.equal(f.canEdit?.value, true)
  f.table.viewDetail({ id: 'template-1' })
  assert.deepEqual(f.calls, [['application-center/Template/Save', { query: { id: 'template-1' } }]])
})

test('revoked permission blocks an existing navigation callback and responds to reauthorization', () => {
  const f = fixture([grant])
  const open = f.table.viewDetail
  assert.equal(f.canEdit?.value, true)
  f.grants.value = []
  assert.equal(f.canEdit?.value, false)
  open({ id: 'template-1' })
  assert.deepEqual(f.calls, [])
  f.grants.value = [grant]
  assert.equal(f.canEdit?.value, true)
  open({ id: 'template-2' })
  assert.deepEqual(f.calls, [['application-center/Template/Save', { query: { id: 'template-2' } }]])
})

test('creation still closes and refreshes, without opening details for add-only users', () => {
  for (const canEdit of [false, true]) {
    const f = fixture(['application-center/Template:add', ...(canEdit ? [grant] : [])])
    let reloads = 0
    f.tableRef.value = { reload: () => reloads++ }
    f.createDialogOpen.value = true
    f.table.handleCreated('new-template')
    assert.equal(f.createDialogOpen.value, false)
    assert.equal(reloads, 1)
    assert.deepEqual(f.calls, canEdit
      ? [['application-center/Template/Save', { query: { id: 'new-template' } }]] : [])
  }
})

test('the actual name slot renders plain text without edit permission and a link with it', async () => {
  const slot = page.match(/<template #name="slotProps">([\s\S]*?)<\/template>/)?.[1]
  assert.ok(slot)
  const render = compile(`<div>${slot}</div>`)
  assert.match(page, /const \{\s*permission,\s*canEdit,/)
  for (const authorized of [false, true]) {
    const f = fixture(authorized ? [grant] : [])
    const app = createSSRApp({
      setup: () => ({ canEdit: f.canEdit, table: f.table, slotProps: { id: 'template-1', name: '应用模板名称' } }),
      render,
    })
    const html = await renderToString(app)
    assert.match(html, /应用模板名称/)
    if (authorized) assert.match(html, /<a\b/)
    else {
      assert.doesNotMatch(html, /<a\b|application-template-page__link/)
      assert.match(html, /<span\b/)
    }
  }
})
