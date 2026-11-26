import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { parse, compileTemplate } from 'vue/compiler-sfc'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const flattenMenus = list => list.flatMap(item => [item, ...flattenMenus(item.children || [])])
const getStaticAttr = (node, name) => node.props?.find(prop => prop.type === 6 && prop.name === name)?.value?.content
const getBoundAttr = (node, name) => node.props?.find(prop => prop.type === 7 && prop.name === 'bind' && prop.arg?.content === name)?.exp?.loc?.source
const collectNodes = (node, predicate, out = []) => {
  if (!node) return out
  if (predicate(node)) out.push(node)
  node.children?.forEach(child => collectNodes(child, predicate, out))
  return out
}

test('RoleLeft adds add/update/delete permission guards to role group buttons', () => {
  const filename = new URL('../views/system/Role/RoleLeft/index.vue', import.meta.url)
  const { descriptor } = parse(readFileSync(filename, 'utf8'))
  const compiled = compileTemplate({ source: descriptor.template.content, filename: filename.pathname, id: 'role-left' })
  assert.deepEqual(compiled.errors, [])

  const buttons = collectNodes(descriptor.template.ast, node => node.tag === 'j-permission-button')
  const perms = buttons.map(node => getStaticAttr(node, 'has-permission') || getStaticAttr(node, 'hasPermission') || getBoundAttr(node, 'hasPermission') || getBoundAttr(node, 'has-permission'))
  assert.deepEqual(perms, ['system/Role:delete', 'system/Role:update', 'system/Role:add'])
})

test('Department LeftTree footer dropdown trigger uses system/Department:add permission button and disables dropdown when unauthorized', () => {
  const filename = new URL('../views/system/Department/components/LeftTree.vue', import.meta.url)
  const { descriptor } = parse(readFileSync(filename, 'utf8'))
  const compiled = compileTemplate({ source: descriptor.template.content, filename: filename.pathname, id: 'department-left-tree' })
  assert.deepEqual(compiled.errors, [])

  const dropdowns = collectNodes(descriptor.template.ast, node => node.tag === 'a-dropdown')
  assert.equal(dropdowns.length, 1)
  assert.equal(getBoundAttr(dropdowns[0], 'disabled'), '!canAdd')

  const triggerButtons = collectNodes(dropdowns[0], node => node.tag === 'j-permission-button')
  assert.equal(triggerButtons.length, 1)
  assert.equal(getBoundAttr(triggerButtons[0], 'hasPermission'), '`${permission}:add`')
})

test('Dictionary, Calendar and DocumentManagement declare view button permissions and Role buttons cover role-group actions', () => {
  const menus = flattenMenus(JSON.parse(read('../baseMenu.json')))
  const byCode = code => menus.find(item => item.code === code)
  const permits = (button, permission, action) =>
    button?.permissions?.some(item => item.permission === permission && item.actions.includes(action))

  const expectedViews = [
    ['system/Dictionary', 'dictionary'],
    ['system/Calendar', 'calendar-manager'],
    ['system/DocumentManagement', 'system_config'],
  ]
  for (const [code, resource] of expectedViews) {
    const menu = byCode(code)
    assert.ok(menu, `menu ${code} exists`)
    const view = menu.buttons?.find(button => button.id === 'view')
    assert.ok(view, `${code} has view button`)
    assert.equal(view.name, '查看')
    assert.equal(view.i18nMessages?.zh_CN, '查看')
    assert.equal(view.i18nMessages?.en_US, 'View')
    assert.equal(view.i18nMessages?.ja_JP, '表示')
    assert.equal(permits(view, resource, 'query'), true, `${code} view grants ${resource}:query`)
  }

  const role = byCode('system/Role')
  assert.equal(permits(role.buttons.find(b => b.id === 'add'), 'role-group', 'save'), true)
  assert.equal(permits(role.buttons.find(b => b.id === 'update'), 'role-group', 'save'), true)
  assert.equal(permits(role.buttons.find(b => b.id === 'delete'), 'role-group', 'delete'), true)
})
