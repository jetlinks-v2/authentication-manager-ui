import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const menus = JSON.parse(readFileSync(new URL('../baseMenu.json', import.meta.url), 'utf8'))

function find(menuCode, items = menus, parent) {
  for (const item of items) {
    if (item.code === menuCode) return { item, parent }
    const match = find(menuCode, item.children || [], item)
    if (match) return match
  }
}

test('third-party login is a distinct Open & Integrate menu route', () => {
  const found = find('system/ThirdPartyLogin')
  assert.equal(found?.parent?.code, 'application-center')
  assert.equal(found?.item?.id, 'system-third-party-login')
  assert.equal(found?.item?.owner, 'cloud')
  assert.equal(found?.item?.url, '/system/third-party-login')
  assert.equal(find('system/Apply')?.item?.name, '单点登录')
  assert.equal(find('system/Apply')?.parent?.code, 'system')
})
