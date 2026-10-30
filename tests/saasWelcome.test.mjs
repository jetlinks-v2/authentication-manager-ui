import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const require = createRequire(import.meta.url)
const vue = require('vue')
const { createI18n } = require('vue-i18n')
const { renderToString } = require('vue/server-renderer')
const { parse, compileScript } = require('vue/compiler-sfc')
const { build } = require('esbuild')
const root = fileURLToPath(new URL('../', import.meta.url))
const zh = JSON.parse(readFileSync(path.join(root, 'locales/lang/zh.json'), 'utf8'))
const en = JSON.parse(readFileSync(path.join(root, 'locales/lang/en.json'), 'utf8'))
const keys = ['saasWelcomeTimed', 'saasGreetingEarlyMorning', 'saasGreetingMorning', 'saasGreetingNoon', 'saasGreetingAfternoon', 'saasGreetingEvening', 'saasWelcome']
const i18n = createI18n({ legacy: false, locale: 'zh', messages: structuredClone({ zh, en }), flatJson: true })
const context = { now: vue.ref(new Date(2026, 0, 1, 5)), composer: i18n.global, intervals: [] }
const bundle = await build({
  stdin: { contents: `export {useSaasWelcome} from './visDashboard/Base/Saas/useSaasWelcome.ts'; export {default as ProjectSummary} from './visDashboard/Base/Saas/components/ProjectSummary.vue'`, resolveDir: root, loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', external: ['vue'],
  plugins: [{ name: 'welcome-fixture', setup(b) {
    b.onResolve({ filter: /\.vue$/ }, args => ({ path: path.resolve(args.resolveDir, args.path), namespace: 'vue' }))
    b.onLoad({ filter: /.*/, namespace: 'vue' }, args => {
      const { descriptor, errors } = parse(readFileSync(args.path, 'utf8'), { filename: args.path })
      if (errors.length) throw errors[0]
      return { contents: compileScript(descriptor, { id: args.path, inlineTemplate: true }).content, loader: 'ts', resolveDir: path.dirname(args.path) }
    })
    b.onResolve({ filter: /^(vue-i18n|@vueuse\/core)$/ }, args => ({ path: args.path, namespace: 'stub' }))
    b.onLoad({ filter: /.*/, namespace: 'stub' }, args => ({ contents: args.path === 'vue-i18n' ? 'export const useI18n=()=>context.composer' : 'export const useNow=options=>{context.intervals.push(options.interval);return context.now}', loader: 'js' }))
  } }],
})
const mod = { exports: {} }
Function('module', 'exports', 'require', 'context', bundle.outputFiles[0].text)(mod, mod.exports, require, context)
const { useSaasWelcome, ProjectSummary } = mod.exports

function setHour(hour) { context.now.value = new Date(2026, 0, 1, hour) }
function expected(period) { return i18n.global.t('packages.ProjectHome.saasWelcomeTimed', { greeting: i18n.global.t(`packages.ProjectHome.saasGreeting${period}`), welcome: i18n.global.t('packages.ProjectHome.saasWelcome') }) }

test('both locales contain every greeting and welcome key', () => {
  for (const messages of [zh, en]) for (const key of keys) assert.ok(messages[`packages.ProjectHome.${key}`], key)
})

test('local-hour boundaries update the greeting and locale changes recompute it', () => {
  i18n.global.locale.value = 'zh'
  const welcome = useSaasWelcome()
  assert.equal(context.intervals.at(-1), 60_000)
  for (const [hour, period] of [[0,'Evening'],[4,'Evening'],[5,'EarlyMorning'],[8,'EarlyMorning'],[9,'Morning'],[11,'Morning'],[12,'Noon'],[13,'Noon'],[14,'Afternoon'],[17,'Afternoon'],[18,'Evening'],[23,'Evening']]) {
    setHour(hour)
    assert.equal(welcome.value, expected(period), `hour ${hour}`)
  }
  setHour(14)
  const chinese = welcome.value
  i18n.global.locale.value = 'en'
  assert.equal(welcome.value, expected('Afternoon'))
  assert.notEqual(welcome.value, chinese)
})

test('ProjectSummary renders translated greeting and welcome in both locales', async () => {
  setHour(12)
  for (const locale of ['zh', 'en']) {
    i18n.global.locale.value = locale
    const app = vue.createSSRApp({ render: () => vue.h(ProjectSummary, { summary: {} }) })
    app.component('a-card', { render() { return vue.h('section', this.$slots.default?.()) } })
    app.component('a-button', { render() { return vue.h('button', this.$slots.default?.()) } })
    const html = await renderToString(app)
    assert.ok(html.includes(`<h1>${expected('Noon')}</h1>`), html)
  }
})
