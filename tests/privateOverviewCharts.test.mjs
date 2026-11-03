import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import test from 'node:test'

const require = createRequire(import.meta.url)
const { ref } = require('vue')
const dayjs = require('dayjs')
const { build } = require('esbuild')
const root = fileURLToPath(new URL('../', import.meta.url))
const { outputFiles } = await build({
  entryPoints: [path.join(root, 'visDashboard/Base/Private/usePrivateCharts.ts')],
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  plugins: [{ name: 'chart-boundaries', setup(builder) {
    const stubs = {
      'vue-i18n': `export const useI18n = () => ({ t: key => key })`,
      'ant-design-vue': `import { ref } from 'vue'; export const theme = { useToken: () => ({ token: ref({ colorBorderSecondary: '#eee', colorTextSecondary: '#666', colorTextQuaternary: '#bbb', colorPrimary: '#1677ff' }) }) }`,
    }
    builder.onResolve({ filter: /^(vue-i18n|ant-design-vue)$/ }, args => ({ path: args.path, namespace: 'stub' }))
    builder.onLoad({ filter: /.*/, namespace: 'stub' }, args => ({ contents: stubs[args.path], loader: 'js', resolveDir: root }))
  } }],
})
const mod = { exports: {} }
Function('module', 'exports', 'require', outputFiles[0].text)(mod, mod.exports, require)
const now = dayjs('2026-10-29T15:23:30')
const point = (time, value) => ({ timestamp: dayjs(time).valueOf(), value })

test('daily chart includes the current partial hour while leaving future hours empty', () => {
  const data = ref({ range: 'today', updatedAt: now.valueOf(), series: [
    { id: 'today', labelKey: 'today', points: [point('2026-10-29T14:00:00', 11), point('2026-10-29T15:00:00', 7), point('2026-10-29T16:00:00', 999)] },
    { id: 'yesterday', labelKey: 'yesterday', points: [point('2026-10-28T15:00:00', 19), point('2026-10-28T16:00:00', 23)] },
    { id: 'failed', labelKey: 'failed', points: [], failed: true },
  ] })
  const { trendOption } = mod.exports.usePrivateCharts(data, ref(undefined))
  const option = trendOption.value
  assert.equal(option.series.length, 2)
  assert.equal(option.series[0].data[14], 11)
  assert.equal(option.series[0].data[15], 7)
  assert.equal(option.series[0].data[16], null)
  assert.equal(option.series[1].data[15], 19)
  assert.equal(option.series[1].data[16], 23)
  assert.equal(option.series[0].type, 'line')
})

test('seven-day trend stays a daily bar series', () => {
  const data = ref({ range: '7d', updatedAt: now.valueOf(), series: [
    { id: '7d', labelKey: '7d', points: [point('2026-10-29T00:00:00', 7)] },
  ] })
  const { trendOption } = mod.exports.usePrivateCharts(data, ref(undefined))
  assert.equal(trendOption.value.series[0].type, 'bar')
  assert.equal(trendOption.value.series[0].data.length, 7)
  assert.equal(trendOption.value.series[0].data[6], 7)
})
