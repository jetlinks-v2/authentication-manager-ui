import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const require = createRequire(import.meta.url)
const vue = require('vue'), { renderToString } = require('vue/server-renderer')
const { parse, compileScript } = require('vue/compiler-sfc'), { build } = require('esbuild')
test('distribution renders embedded map and passes the video scope to offline list', async () => {
  const file = fileURLToPath(new URL('../views/resources/Dashboard/components/ResourceDeviceDistribution.vue', import.meta.url))
  const source = compileScript(parse(readFileSync(file, 'utf8'), { filename: file }).descriptor, { id: file, inlineTemplate: true }).content
  const built = await build({ stdin: { contents: source, resolveDir: fileURLToPath(new URL('../views/resources/Dashboard/components/', import.meta.url)), loader: 'ts' }, bundle: true, write: false, format: 'cjs', platform: 'node', packages: 'external', external: ['vue'], plugins: [{ name: 'distribution-boundaries', setup(api) {
    api.onResolve({ filter: /^vue-i18n$/ }, () => ({ path: 'locale', namespace: 'stub' }))
    api.onResolve({ filter: /^@jetlinks-web-core\/components\/DashBoardCanvas$/ }, () => ({ path: 'canvas', namespace: 'stub' }))
    api.onResolve({ filter: /resourcePageContext$/ }, () => ({ path: 'context', namespace: 'stub' }))
    api.onResolve({ filter: /^\.\/ResourceDeviceMap\.vue$/ }, args => ({ path: fileURLToPath(new URL('../views/resources/Dashboard/components/ResourceDeviceMap.vue', import.meta.url)), namespace: 'map-sfc' }))
    api.onResolve({ filter: /\.vue$/ }, args => ({ path: args.path, namespace: 'stub' }))
    api.onResolve({ filter: /^ant-design-vue$/ }, () => ({ path: 'ant', namespace: 'stub' }))
    api.onLoad({ filter: /.*/, namespace: 'map-sfc' }, args => ({ contents: compileScript(parse(readFileSync(args.path, 'utf8'), { filename: args.path }).descriptor, { id: args.path, inlineTemplate: true }).content, loader: 'ts', resolveDir: fileURLToPath(new URL('../views/resources/Dashboard/components/', import.meta.url)) }))
    api.onLoad({ filter: /.*/, namespace: 'stub' }, args => ({ loader: 'js', contents:
      args.path === 'locale' ? 'export const useI18n=()=>({t:key=>key})'
      : args.path === 'ant' ? 'export const Skeleton={render(){return null}}'
      : args.path === 'canvas' ? 'import {h} from "vue";export const DashboardWidgetRenderer={props:["widget"],render(){return h("div",{"data-embedded":this.widget.componentProps.deviceMapCard.embedded,"data-term":this.widget.componentProps.deviceMapCard.deviceTerms[0]})}}'
      : args.path === 'context' ? 'export const useResourcePageContext=()=>context.runtime'
      : args.path.includes('ResourceOfflineDevices') ? 'import {h} from "vue";export default {props:["deviceScope"],render(){return h("div",{"data-scope":this.deviceScope.listType})}}'
      : 'export default {}' }))
  } }] })
  const mod = { exports: {} }, original = { componentProps: { deviceMapCard: { deviceTerms: ['video'] } } }
  const context = { runtime: { mapWidget: vue.ref(original), mapDefinition: vue.ref({}), mapLoading: vue.ref(false), deviceScope: vue.ref({ listType: 'video' }), scope: vue.ref('scope') } }
  Function('module', 'exports', 'require', 'context', built.outputFiles[0].text)(mod, mod.exports, require, context)
  const app = vue.createSSRApp({ render: () => vue.h(mod.exports.default) })
  app.component('a-card', { render() { return vue.h('article', this.$slots.default?.()) } })
  const html = await renderToString(app)
  assert.match(html, /data-embedded="true"/)
  assert.match(html, /data-term="video"/)
  assert.match(html, /data-scope="video"/)
  assert.equal(original.componentProps.deviceMapCard.embedded, undefined)
})
