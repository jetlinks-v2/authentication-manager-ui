import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import ts from 'typescript'
import * as vue from 'vue'
import { renderToString } from 'vue/server-renderer'
import { parse, compileScript } from 'vue/compiler-sfc'

// Render the production SFC against real translations so position-based status bugs remain observable.
const filename = fileURLToPath(new URL('../visDashboard/Base/QuickGuide/components/HomeView.vue', import.meta.url))
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

const stepKeys = ['space', 'gateway', 'device', 'algorithm', 'alarm', 'application']
const translationStep = { gateway: 1, space: 3, device: 2, algorithm: 4, alarm: 5, application: 6 }

function makeSteps(statuses, keys = stepKeys) {
  return keys.map((key, index) => ({
    key,
    title: translations[locale][`packages.ProjectHome.QuickGuide_step${translationStep[key]}`],
    description: translations[locale][`packages.ProjectHome.QuickGuide_step${translationStep[key]}_desc`],
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
  app.component('a-tooltip', {
    props: ['title'],
    setup: (_props, { slots }) => () => slots.default?.(),
  })
  app.component('j-ellipsis', {
    setup: (_props, { slots }) => () => vue.h('span', slots.default?.()),
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

test('every completed step displays its completion marker regardless of ordering', async () => {
  const keys = ['application', 'space', 'alarm', 'algorithm', 'gateway', 'device']
  const html = await render(makeSteps(keys.map(() => 'complete'), keys))
  for (const key of keys) assert.match(card(html, key), /completed-corner\.svg/)
  assert.deepEqual(arrows(html), Array(5).fill('../assets/arrow-complete.svg'))
})

test('the first four completed steps retain pending alarm and application actions', async () => {
  const html = await render(makeSteps(['complete', 'complete', 'complete', 'complete', 'incomplete', 'incomplete']))
  assert.deepEqual(arrows(html), [
    '../assets/arrow-complete.svg', '../assets/arrow-complete.svg', '../assets/arrow-complete.svg',
    '../assets/arrow-pending.svg', '../assets/arrow-pending.svg',
  ])
  for (const key of stepKeys.slice(0, 4)) assert.match(card(html, key), /completed-corner\.svg/)
  assert.doesNotMatch(card(html, 'alarm'), /completed-corner\.svg/)
  assert.match(card(html, 'alarm'), /去配置/)
  assert.match(card(html, 'application'), /去创建/)
})

test('all six incomplete steps render the correct action and description in Chinese and English', async () => {
  for (const language of ['zh', 'en']) {
    locale = language
    const steps = makeSteps(stepKeys.map(() => 'incomplete'))
    const html = await render(steps)
    for (const step of steps) {
      assert.ok(card(html, step.key).includes(step.actionText))
      assert.ok(card(html, step.key).includes(step.description))
      assert.doesNotMatch(card(html, step.key), /completed-corner\.svg|completed\.svg/)
    }
    assert.deepEqual(arrows(html), Array(5).fill('../assets/arrow-pending.svg'))
  }
  locale = 'zh'
})

test('loading and unavailable states never imply a completed connection, and disabled cards retain permission feedback', async () => {
  const steps = makeSteps(['loading', 'complete', 'unknown', 'complete', 'loading', 'incomplete'])
  steps[2].disabled = true
  const html = await render(steps)
  assert.match(card(html, 'space'), /查询中/)
  assert.match(card(html, 'device'), /状态暂不可用/)
  assert.doesNotMatch(card(html, 'space'), /completed-corner\.svg|step-card-action/)
  assert.doesNotMatch(card(html, 'device'), /completed-corner\.svg|step-card-action/)
  assert.match(html, /<button[^>]*data-step="device"[^>]*disabled/)
  assert.ok(html.includes(translations.zh['packages.ProjectHome.unavailable']))
  assert.deepEqual(arrows(html), Array(5).fill('../assets/arrow-pending.svg'))
})

test('original step illustrations retain the sprite while alarm and application use their supplied icons', async () => {
  const keys = ['application', 'device', 'alarm', 'space', 'algorithm', 'gateway']
  const html = await render(makeSteps(keys.map(() => 'incomplete'), keys))
  for (const key of ['space', 'gateway', 'device', 'algorithm']) {
    assert.match(card(html, key), /quick-guide-illustrations\.png/)
    assert.doesNotMatch(card(html, key), /assets\/(alarm|application)\.png/)
  }
  assert.match(card(html, 'alarm'), /assets\/alarm\.png/)
  assert.match(card(html, 'application'), /assets\/application\.png/)
})
