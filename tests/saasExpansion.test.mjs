import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'

const require = createRequire(import.meta.url)
const { build } = require('esbuild')
const root = fileURLToPath(new URL('../', import.meta.url))
const base = path.join(root, 'visDashboard/Base/Saas')
const result = await build({
  stdin: { contents: `export * from ${JSON.stringify(path.join(base, 'useQuotaExpansion.ts'))}; export * from ${JSON.stringify(path.join(base, 'services/presentation.ts'))}`, resolveDir: root, loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  plugins: [{ name: 'boundaries', setup(b) {
    for (const [filter, contents] of [
      [/^vue-i18n$/, "export const useI18n = () => ({ t: key => key, locale: { value: 'zh-CN' } })"],
      [/^@jetlinks-web\/utils$/, 'export const onlyMessage = (...args) => context.messages.push(args)'],
    ]) {
      const namespace = `stub${Math.random()}`
      b.onResolve({ filter }, () => ({ path: 'stub', namespace }))
      b.onLoad({ filter: /.*/, namespace }, () => ({ contents, loader: 'js' }))
    }
  } }],
})
function fixture(edit = false) {
  const context = { messages: [] }
  const module = { exports: {} }
  Function('module', 'exports', 'require', 'context', result.outputFiles[0].text)(module, module.exports, require, context)
  return { api: module.exports, context, form: module.exports.useQuotaExpansion(() => edit) }
}
const rows = [
  { id: 'devices', label: '设备', value: 412, limit: 500, unit: '台' },
  { id: 'screens', label: '大屏', value: 7, limit: 20, unit: '个' },
  { id: 'failed', failed: true, value: 1, limit: 2 },
  { id: 'unlimited', value: 2, limit: -1 },
]

test('valid quotas preserve real values, reject invalid quantities, and submit locally without changing rows', () => {
  const { form, context } = fixture()
  const before = structuredClone(rows)
  form.open(rows)
  assert.equal(form.view.value.isMock, false)
  assert.equal(form.view.value.usage, '412 / 500 台')
  assert.equal(form.view.value.nextLimit, '501 台')
  assert.deepEqual(form.view.value.options.map(option => option.disabled), [false, false, true, true])
  for (const amount of [null, 0, -1, 1.5, 1000000, NaN]) {
    form.change({ amount })
    form.submit()
    assert.ok(form.view.value.error)
    assert.equal(form.visible.value, true)
    assert.equal(form.view.value.nextLimit, '')
  }
  assert.equal(context.messages.length, 0)
  for (const quotaId of ['failed', 'unlimited']) {
    form.change({ quotaId })
    assert.equal(form.view.value.canSubmit, false)
    form.submit()
    assert.equal(form.visible.value, true)
  }
  form.change({ quotaId: 'screens' })
  form.change({ amount: 999999, note: 'text' })
  assert.equal(form.view.value.nextLimit, '1,000,019 个')
  form.submit()
  assert.equal(form.visible.value, false)
  assert.deepEqual(context.messages, [['packages.ProjectHome.saasExpansionSaved', 'success']])
  form.submit()
  assert.equal(context.messages.length, 1)
  assert.deepEqual(rows, before)
  form.open(rows)
  assert.equal(form.view.value.usage, '412 / 500 台')
  assert.deepEqual({ ...form.view.value.form }, { quotaId: 'devices', amount: 1, note: '' })
})

test('all unavailable quotas use ten labeled and unit-bearing examples without modifying real rows', () => {
  for (const input of [[], [{ id: 'failed', failed: true }], [{ id: 'unknown' }], [{ id: 'unlimited', limit: -1, value: 2 }]]) {
    const before = structuredClone(input)
    const { form, context } = fixture()
    form.open(input)
    assert.equal(form.view.value.isMock, true)
    assert.equal(form.view.value.options.length, 10)
    assert.ok(form.view.value.options.every(option => option.label && !option.disabled))
    for (const option of form.view.value.options) {
      form.change({ quotaId: option.value })
      assert.ok(form.view.value.unit)
      assert.ok(form.view.value.usage)
      assert.ok(form.view.value.nextLimit)
    }
    form.submit()
    assert.equal(form.visible.value, false)
    assert.equal(context.messages.length, 1)
    assert.deepEqual(input, before)
  }
})

test('cancel and reopen reset selection and disabled editing never opens or submits', () => {
  const { form, context } = fixture()
  form.open([])
  const first = form.view.value.form.quotaId
  form.change({ quotaId: form.view.value.options[1].value })
  form.change({ amount: 7, note: 'text' })
  form.close()
  form.open([])
  assert.deepEqual({ ...form.view.value.form }, { quotaId: first, amount: 1, note: '' })
  assert.equal(context.messages.length, 0)
  const editing = fixture(true)
  editing.form.open(rows)
  editing.form.submit()
  assert.equal(editing.form.visible.value, false)
  assert.equal(editing.context.messages.length, 0)
})

test('today end reflects the request timestamp and failed labels identify affected metrics', () => {
  const { api } = fixture()
  const date = new Date(2026, 9, 29, 13, 47).getTime()
  assert.equal(api.todayWindowEnd([{ date }]), '13:47')
  assert.equal(api.todayWindowEnd([]), undefined)
  assert.equal(api.todayWindowEnd([{ date: 'invalid' }]), undefined)
  assert.equal(api.failedMetricLabels([{ id: 'a', failed: true, label: '大屏' }, { id: 'b', failed: true, labelKey: 'saasVideo' }, { id: 'c' }], key => `T:${key}`), '大屏、T:packages.ProjectHome.saasVideo')
})
