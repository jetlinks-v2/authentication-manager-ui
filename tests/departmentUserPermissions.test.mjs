import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { build } from 'esbuild'
import { parse, compileTemplate } from 'vue/compiler-sfc'

const root = fileURLToPath(new URL('../', import.meta.url))
const { outputFiles } = await build({
  stdin: { contents: `export { default as getMenus } from './baseMenu';
    export * from './views/system/Menu/Setting/utils';`, resolveDir: root },
  bundle: true, write: false, format: 'esm', platform: 'node',
  define: { 'import.meta.env': '{}', window: '{}' },
  plugins: [{
    name: 'menu-constants',
    setup(plugin) {
      plugin.onResolve({ filter: /^@jetlinks-web-core\/utils\/consts$/ }, () => ({
        path: fileURLToPath(new URL('../../../jetlinks-web-core/src/utils/consts.ts', import.meta.url)),
      }))
    },
  }],
})
const { getMenus, flattenMenus, createMenuDrafts, synchronizeMenuDefinitions, buildMenuPayloads } =
  await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`)
const department = flattenMenus(getMenus()).find(menu => menu.code === 'system/Department')
const button = id => department.buttons.find(item => item.id === id)
const permits = (item, resource, action) => item.permissions.some(permission =>
  permission.permission === resource && permission.actions.includes(action))

test('organization member actions include the existing backend save guards', () => {
  assert.equal(permits(button('view'), 'role', 'query'), true)
  assert.equal(permits(button('view'), 'user', 'save'), false)
  for (const id of ['bind-user', 'bind']) {
    for (const resource of ['user', 'organization']) {
      assert.equal(permits(button(id), resource, 'query'), true, `${id}: ${resource}/query`)
      assert.equal(permits(button(id), resource, 'save'), true, `${id}: ${resource}/save`)
    }
  }
  assert.equal(permits(button('bind-user'), 'organization', 'bind-user'), true)
  assert.equal(permits(button('bind'), 'organization', 'unbind-user'), true)
  assert.equal(permits(button('bind-user'), 'role', 'query'), true)
  assert.equal(permits(button('bind-user'), 'role-group', 'query'), true)
  assert.equal(permits(button('bind-user'), 'user', 'delete'), false)
  assert.equal(button('add-user'), undefined)
  assert.deepEqual(department.assetTypes, ['organization', 'user', 'role', 'roleGroup'])
  assert.equal(department.assetType, '')
})

test('real member template keeps the existing create, bind and unbind permission identifiers', () => {
  const filename = new URL('../views/system/Department/user/index.vue', import.meta.url)
  const { descriptor } = parse(readFileSync(filename, 'utf8'))
  const compiled = compileTemplate({ source: descriptor.template.content, filename: filename.pathname, id: 'department-user' })
  assert.deepEqual(compiled.errors, [])
  const permissions = []
  const visit = node => {
    if (node.tag === 'j-permission-button') {
      const binding = node.props.find(prop => prop.name === 'bind' && prop.arg?.content === 'hasPermission')
      permissions.push(binding.exp.loc.source)
    }
    node.children?.forEach(visit)
  }
  visit(descriptor.template.ast)
  assert.deepEqual(permissions, [
    '`${permission}:bind-user`', '`${permission}:bind-user`',
    '`${permission}:bind`', '`${permission}:bind`',
  ])
})

test('synchronizing an existing organization menu preserves settings and saves all related assets', () => {
  const saved = structuredClone(department)
  saved.assetType = 'organization'
  delete saved.assetTypes
  saved.sortIndex = 77
  saved.options = { show: true }
  saved.buttons = [{ id: 'bind-user', permissions: [{ permission: 'organization', actions: ['bind-user'] }] }]
  const { drafts } = createMenuDrafts([department], [saved])
  const synced = synchronizeMenuDefinitions(drafts, [department])
  const payload = buildMenuPayloads(synced, []).iot.find(menu => menu.id === department.id)
  assert.equal(payload.owner, 'iot')
  assert.equal(payload.options.show, true)
  assert.equal(payload.sortIndex, 77)
  assert.deepEqual(payload.assetTypes, ['organization', 'user', 'role', 'roleGroup'])
  assert.equal(payload.buttons.some(item => item.id === 'add-user'), false)
  assert.equal(permits(payload.buttons.find(item => item.id === 'bind-user'), 'role-group', 'query'), true)
  assert.equal(permits(payload.buttons.find(item => item.id === 'bind-user'), 'user', 'save'), true)
  assert.equal(saved.buttons.length, 1)
  assert.equal(saved.assetTypes, undefined)
})
