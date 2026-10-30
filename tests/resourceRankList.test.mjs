import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
const require = createRequire(import.meta.url)
const vue = require('vue')
const { renderToString } = require('vue/server-renderer')
const { parse, compileScript } = require('vue/compiler-sfc')
const { build } = require('esbuild')
const filename = fileURLToPath(new URL('../visDashboard/ResourceCenter/components/ResourceRankList.vue', import.meta.url))
const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
const compiled = compileScript(descriptor, { id: filename, inlineTemplate: true })
const output = await build({ stdin: { contents: compiled.content, loader: 'ts', resolveDir: fileURLToPath(new URL('../', import.meta.url)) }, bundle: true, write: false, platform: 'node', format: 'cjs', external: ['vue'], plugins: [{ name: 'icons-and-ellipsis', setup(api) {
  api.onResolve({ filter: /^@jetlinks-web\/components$|^@ant-design\/icons-vue$/ }, args => ({ path: args.path, namespace: 'stub' }))
  api.onLoad({ filter: /.*/, namespace: 'stub' }, args => ({ contents: args.path.includes('icons') ? 'export const RightOutlined={render:()=>null}' : `import {h} from 'vue'; export const Ellipsis={setup(_, {slots}) {return ()=>h('span',slots.default?.())}}`, loader: 'js' }))
} }] })
const module = { exports: {} }
Function('module', 'exports', 'require', output.outputFiles[0].text)(module, module.exports, require)
const RankList = module.exports.default

test('non-online row text keeps its supplied color and inactive styling', async () => {
  const rows = [
    { id: 'offline', rank: 0, label: 'offline', text: '离线', width: 0, online: false, color: '#ff4d4f', detailAvailable: false },
    { id: 'disabled', rank: 0, label: 'disabled', text: '禁用', width: 0, online: false, color: '#bfbfbf', detailAvailable: false },
    { id: 'missing', rank: 0, label: 'missing', text: '—', width: 0, online: true, color: '#bfbfbf', detailAvailable: false },
    { id: 'unknown', rank: 0, label: 'unknown', text: '未知', width: 0, color: '#bfbfbf', detailAvailable: false },
  ]
  const html = await renderToString(vue.createSSRApp({ render: () => vue.h(RankList, { rows, interactive: false }) }))
  const values = [...html.matchAll(/<span class="(value[^"]*)" style="([^"]*)">([^<]*)<\/span>/g)].map(match => match.slice(1))
  assert.deepEqual(values, [
    ['value value--inactive', 'color:#ff4d4f;', '离线'],
    ['value value--inactive', 'color:#bfbfbf;', '禁用'],
    ['value', 'color:#bfbfbf;', '—'],
    ['value', 'color:#bfbfbf;', '未知'],
  ])
  assert.doesNotMatch(descriptor.styles.map(style => style.content).join('\n'), /\.value--inactive\s*\{[^}]*color\s*:/)
})
