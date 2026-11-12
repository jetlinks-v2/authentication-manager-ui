import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { transformSync } from 'esbuild'
import * as vue from 'vue'

const source = readFileSync(new URL('../views/application-center/ProjectApplication/Detail/useApplicationDetailTabs.ts', import.meta.url), 'utf8')
const module = { exports: {} }
new Function('require', 'module', 'exports', transformSync(source, { loader: 'ts', format: 'cjs' }).code)(id => {
  if (id === 'vue') return vue
  if (id === 'vue-i18n') return { useI18n: () => ({ t: key => key }) }
  throw new Error(`Unexpected runtime dependency: ${id}`)
}, module, module.exports)

function fixture(t, initial = 'settings') {
  const scope = vue.effectScope(), id = vue.ref('first'), query = vue.ref(initial)
  const state = scope.run(() => module.exports.useApplicationDetailTabs(id, () => query.value))
  t.after(() => scope.stop())
  return { ...state, id, query }
}

test('panels are admitted lazily and stay admitted when revisiting another tab', t => {
  const state = fixture(t)
  assert.deepEqual([...state.visitedTabs.value], ['settings'])
  state.changeTab('users')
  state.changeTab('settings')
  assert.deepEqual([...state.visitedTabs.value], ['settings', 'users'])
  assert.equal(state.visitedTabs.value.has('roles'), false)
  state.changeTab('roles')
  assert.deepEqual([...state.visitedTabs.value], ['settings', 'users', 'roles'])
  assert.deepEqual(state.tabOptions.value.map(tab => tab.key), ['settings', 'users', 'roles'])
})

test('changing the application drops previous panel instances and restores the existing deep link', t => {
  const state = fixture(t, 'roles')
  assert.equal(state.activeTab.value, 'roles')
  state.changeTab('users')
  state.query.value = 'settings'
  state.id.value = 'second'
  assert.equal(state.activeTab.value, 'settings')
  assert.deepEqual([...state.visitedTabs.value], ['settings'])
  state.query.value = 'roles'
  state.id.value = 'third'
  assert.deepEqual([...state.visitedTabs.value], ['roles'])
})

test('invalid navigation cannot select or mount an unknown panel', t => {
  const state = fixture(t, 'unknown')
  state.changeTab('missing')
  state.changeTab(1)
  assert.equal(state.activeTab.value, 'settings')
  assert.deepEqual([...state.visitedTabs.value], ['settings'])
})
