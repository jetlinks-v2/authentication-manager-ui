import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const menus = JSON.parse(readFileSync(new URL('../baseMenu.json', import.meta.url), 'utf8'))
const applyPage = readFileSync(new URL('../views/system/Apply/index.vue', import.meta.url), 'utf8')
const applySavePage = readFileSync(new URL('../views/system/Apply/Save/index.vue', import.meta.url), 'utf8')
const applyEditForm = readFileSync(
  new URL('../views/system/Apply/Save/components/EditForm.vue', import.meta.url),
  'utf8',
)

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
})

test('third-party application reuses the Apply page under Open & Integrate', () => {
  const found = find('system/Apply')
  assert.equal(found?.parent?.code, 'application-center')
  assert.equal(found?.item?.name, '第三方应用')
  assert.equal(found?.item?.url, '/system/Apply')

  const applyMenus = JSON.stringify(menus).match(/"code":"system\/Apply"/g) || []
  assert.equal(applyMenus.length, 1)
})

test('adding an application skips type selection and defaults to third-party', () => {
  assert.match(
    applyPage,
    /toAdd:\s*\(\)\s*=>\s*\{[\s\S]*?jumpPage\('system\/Apply\/Save',[\s\S]*?provider:\s*'third-party'/,
  )
  assert.doesNotMatch(applyPage, /import Add from '\.\/Save\/Add\.vue'/)
  assert.doesNotMatch(applyPage, /<Add\s/)
  assert.match(applySavePage, /ref<applyType>\('third-party'\)/)
  assert.match(applyEditForm, /provider:\s*'third-party'/)
  assert.match(applyEditForm, /logoUrl:\s*systemImg\.thirdParty/)
})

test('application form keeps the configuration area wider than the help panel', () => {
  assert.match(applySavePage, /left-width="1fr"/)
  assert.match(applySavePage, /right-width="18\.75rem"/)
  assert.match(applySavePage, /<Does\s+:type="rightType"/)
})

test('third-party application list always queries the third-party provider', () => {
  assert.match(applyPage, /:request="queryThirdPartyApplications"/)
  assert.match(
    applyPage,
    /queryThirdPartyApplications[\s\S]*?getApplyList_api\(\{[\s\S]*?terms:[\s\S]*?column:\s*'provider',[\s\S]*?termType:\s*'eq',[\s\S]*?value:\s*'third-party'/,
  )
  assert.match(applyPage, /filter\(\(term:\s*any\)\s*=>\s*term\?\.column\s*!==\s*'provider'\)/)
})

test('editing an existing application still restores its persisted provider', () => {
  assert.match(applyEditForm, /if \(isEditing\) \{\s*getInfo\(routeQuery\.id as string\)/)
  assert.match(
    applyEditForm,
    /form\.data\s*=\s*\{[\s\S]*?\.\.\.resp\.result,[\s\S]*?integrationModes:/,
  )
})
