import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import { computed, effectScope, reactive, ref, watch } from 'vue'
import { parse } from 'vue/compiler-sfc'

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const page = read('../views/application-center/ProjectApplication/index.vue')
const source = read('../views/application-center/ProjectApplication/useApplicationList.ts')
const addPermission = 'application-center/ProjectApplication:add'

function fixture(initialGrants = [], action) {
  const grants = ref(initialGrants)
  const route = reactive({ query: { action, type: 'business' } })
  const replacements = []
  const store = reactive({ applications: [], templates: [],
    loadApplications: async () => {}, loadTemplates: async () => {} })
  const dependencies = {
    vue: { computed, ref, watch, onMounted() {} },
    'vue-router': { useRoute: () => route, useRouter: () => ({ replace: async ({ query }) => {
      replacements.push(query)
      route.query = query
    } }) },
    'vue-i18n': { useI18n: () => ({ t: key => key }) },
    '@jetlinks-web/utils': { onlyMessage() {} },
    '@jetlinks-web-core/store/menu': { useMenuStore: () => ({ jumpPage() {} }) },
    '@jetlinks-web-core/store/auth': { useAuthStore: () => ({ hasPermission: key => grants.value.includes(key) }) },
    '@jetlinks-web-core/store/user': { useUserStore: () => ({ userInfo: { id: 'user' } }) },
    '@jetlinks-web-core/components/AssetOwnershipCondition': { createAssetOwnershipField: () => ({}) },
    './ownershipSelectors': { createOwnershipCreatorSelector() {} },
    './applicationModel': { getApplicationProviderOptions: () => [] },
    './useApplicationDeletion': { useApplicationDeletion: () => ({ deletingApplicationIds: new Set(), deleteApplication: async () => false }) },
    './useApplicationOpenGuard': { useApplicationOpenGuard: () => ({ openingApplicationIds: ref([]), openApplication() {} }) },
    './useProjectApplication': { useProjectApplication: () => store },
  }
  const js = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', js)(id => {
    assert.ok(id in dependencies, `Unexpected dependency: ${id}`)
    return dependencies[id]
  }, module, module.exports)
  const scope = effectScope()
  const state = scope.run(() => module.exports.useApplicationList())
  return { ...state, grants, route, replacements, stop: () => scope.stop() }
}

test('only the existing add button grant opens the create dialog', () => {
  for (const grants of [[], ['business-application:save'],
    ...['view', 'update', 'remove', 'action'].map(id => [`application-center/ProjectApplication:${id}`]), [addPermission]]) {
    const f = fixture(grants)
    try {
      assert.equal(f.canCreate?.value, grants.includes(addPermission))
      assert.equal(typeof f.openCreate, 'function')
      f.openCreate()
      assert.equal(f.createOpen.value, grants.includes(addPermission))
    } finally { f.stop() }
  }
})

test('one-time route creation respects add permission and preserves other query fields', () => {
  for (const authorized of [true, false]) {
    const f = fixture(authorized ? [addPermission] : [], 'create')
    try {
      assert.equal(f.createOpen.value, authorized)
      assert.deepEqual(f.replacements, [{ type: 'business' }])
      assert.equal(f.route.query.action, undefined)
    } finally { f.stop() }
  }
})

test('revoking permission closes the dialog and blocks a saved open callback', () => {
  const f = fixture([addPermission])
  try {
    assert.equal(typeof f.openCreate, 'function')
    const open = f.openCreate
    open()
    assert.equal(f.createOpen.value, true)
    f.grants.value = []
    assert.equal(f.canCreate?.value, false)
    assert.equal(f.createOpen.value, false)
    open()
    assert.equal(f.createOpen.value, false)
    f.grants.value = [addPermission]
    open()
    assert.equal(f.createOpen.value, true)
  } finally { f.stop() }
})

test('only application records form the grid and the inline create node and styles are removed', () => {
  const { descriptor, errors } = parse(page)
  assert.deepEqual(errors, [])
  const grid = descriptor.template.content.match(/<ResponsiveGrid\b[\s\S]*?<\/ResponsiveGrid>/)?.[0]
  assert.ok(grid)
  assert.match(grid, /<ApplicationCard\b/)
  assert.doesNotMatch(grid, /<button\b|create-card|createCard/)
  assert.doesNotMatch(page, /create-card|ProjectApplication\.list\.createCard/)
})

test('top and empty-state buttons use the existing add permission and guard dialog mounting', () => {
  const buttons = [...page.matchAll(/<j-permission-button\b([\s\S]*?)<\/j-permission-button>/g)]
  assert.equal(buttons.length, 2)
  for (const [, button] of buttons) {
    assert.ok(button.includes(':hasPermission="`${permission}:add`"'))
    assert.match(button, /@click="openCreate"/)
  }
  assert.match(page, /<ApplicationCreateDialog\s+v-if="canCreate"/)
  assert.doesNotMatch(page, /@click="createOpen = true"/)
})

test('list and existing add permission labels consistently say add application', () => {
  for (const [locale, label] of [['zh', '新增应用'], ['en', 'Add Application'], ['ja', 'アプリケーションを追加']]) {
    const messages = JSON.parse(read(`../locales/lang/${locale}.json`))
    assert.equal(messages['ProjectApplication.list.create'], label)
    assert.equal(messages['ProjectApplication.list.createCard'], undefined)
  }
  const flatten = menus => menus.flatMap(menu => [menu, ...flatten(menu.children ?? [])])
  const menu = flatten(JSON.parse(read('../baseMenu.json'))).find(menu => menu.code === 'application-center/ProjectApplication')
  const button = menu.buttons.find(button => button.id === 'add')
  assert.equal(button.name, '新增应用')
  assert.equal(button.i18nMessages.zh_CN, '新增应用')
  assert.deepEqual(button.permissions, [{ permission: 'business-application', actions: ['save'] }])
})
