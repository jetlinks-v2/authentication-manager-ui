import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import * as vue from 'vue'
import { renderToString } from 'vue/server-renderer'
import { parse, compileScript } from 'vue/compiler-sfc'

// Render the production SFC against real translations so position-based status bugs remain observable.
const filename = new URL('../visDashboard/Base/QuickGuide/components/HomeView.vue', import.meta.url).pathname
const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
const script = compileScript(descriptor, { id: 'quick-guide-view-test', inlineTemplate: true })
const output = ts.transpileModule(script.content, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
} }).outputText
const translations = Object.fromEntries(['zh', 'en'].map(locale => [locale,
  JSON.parse(readFileSync(new URL(`../locales/lang/${locale}.json`, import.meta.url), 'utf8')),
]))
let locale = 'zh'
const exports = {}
new Function('exports', 'require', output)(exports, id => {
  if (id === 'vue') return vue
  if (id === 'vue-i18n') return { useI18n: () => ({ t: key => translations[locale][key] ?? key }) }
  if (id === '@ant-design/icons-vue') return {
    LoadingOutlined: () => vue.h('span', 'loading'),
    QuestionCircleOutlined: () => vue.h('span', 'unknown'),
  }
  if (/\.(png|svg)$/.test(id)) return id
  throw new Error(`Unexpected test dependency: ${id}`)
})

const stepKeys = ['gateway', 'space', 'device', 'algorithm']
const translationStep = { gateway: 1, space: 3, device: 2, algorithm: 4 }

function makeSteps(statuses, keys = stepKeys) {
  return keys.map((key, index) => ({
    key,
    title: translations[locale][`packages.ProjectHome.QuickGuide_step${translationStep[key]}`],
    description: `Description of ${key}`,
    actionText: translations[locale][`packages.ProjectHome.QuickGuide_step${translationStep[key]}_action`],
    target: { menus: [key] },
    status: statuses[index],
    statusText: translations[locale][`packages.ProjectHome.QuickGuide_status_${statuses[index]}`],
  }))
}

async function render(steps) {
  const app = vue.createSSRApp({ render: () => vue.h(exports.default, { steps }) })
  app.component('a-button', {
    inheritAttrs: false,
    props: ['disabled'],
    setup: (props, { attrs, slots }) => () => vue.h('button', { ...attrs, disabled: props.disabled }, slots.default?.()),
  })
  return renderToString(app)
}

function card(html, key) {
  const match = html.match(new RegExp(`<button[^>]*data-step="${key}"[^>]*>([\\s\\S]*?)</button>`))
  assert.ok(match, `The ${key} card must be rendered`)
  return match[1]
}

function arrows(html) {
  return [...html.matchAll(/<img[^>]*class="step-separator"[^>]*src="([^"]+)"/g)].map(match => match[1])
}

test('every completed step displays a corner and completed connectors regardless of ordering', async () => {
  const keys = ['space', 'algorithm', 'gateway', 'device']
  const html = await render(makeSteps(keys.map(() => 'complete'), keys))
  for (const key of keys) assert.match(card(html, key), /completed-corner\.svg/)
  assert.deepEqual(arrows(html), Array(3).fill('../assets/arrow-complete.svg'))
})

test('three completed steps highlight both completed connections and leave the pending connection grey', async () => {
  const html = await render(makeSteps(['complete', 'complete', 'complete', 'incomplete']))
  assert.deepEqual(arrows(html), ['../assets/arrow-complete.svg', '../assets/arrow-complete.svg', '../assets/arrow-pending.svg'])
  for (const key of stepKeys.slice(0, 3)) assert.match(card(html, key), /completed-corner\.svg/)
  assert.doesNotMatch(card(html, 'algorithm'), /completed-corner\.svg/)
  assert.match(card(html, 'algorithm'), /去接入/)
})

test('all incomplete steps use the connect action in Chinese and English without completion markers', async () => {
  for (const language of ['zh', 'en']) {
    locale = language
    const html = await render(makeSteps(stepKeys.map(() => 'incomplete')))
    for (const key of stepKeys) {
      assert.match(card(html, key), language === 'zh' ? /去接入/ : /Connect/)
      assert.doesNotMatch(card(html, key), /completed-corner\.svg|completed\.svg/)
    }
    assert.deepEqual(arrows(html), Array(3).fill('../assets/arrow-pending.svg'))
  }
  locale = 'zh'
})

test('loading and unavailable states never show completion or imply a completed connection', async () => {
  const steps = makeSteps(['loading', 'complete', 'unknown', 'incomplete'])
  steps[2].disabled = true
  const html = await render(steps)
  assert.match(card(html, 'gateway'), /查询中/)
  assert.match(card(html, 'device'), /状态暂不可用/)
  assert.doesNotMatch(card(html, 'gateway'), /completed-corner\.svg|step-card-action/)
  assert.doesNotMatch(card(html, 'device'), /completed-corner\.svg|step-card-action/)
  assert.match(html, /<button[^>]*data-step="device"[^>]*disabled/)
  assert.deepEqual(arrows(html), Array(3).fill('../assets/arrow-pending.svg'))
})
