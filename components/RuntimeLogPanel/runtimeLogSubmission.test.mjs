import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync, mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { parse, compileScript } from 'vue/compiler-sfc'

const require = createRequire(import.meta.url)
const entry = fileURLToPath(new URL('./RuntimeLogPanel.vue', import.meta.url))
const result = await build({
  stdin: {
    contents: `export {default as Panel} from ${JSON.stringify(entry)};
      export {default as Form} from 'ant-design-vue/es/form/Form.js';
      export {createRenderer,ref,h,nextTick} from 'vue';`,
    resolveDir: path.dirname(entry),
  },
  bundle: true, write: false, platform: 'node', format: 'esm',
  define: { __VUE_OPTIONS_API__: 'true', __VUE_PROD_DEVTOOLS__: 'false', __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false', 'process.env.NODE_ENV': '"test"' },
  plugins: [{
    name: 'runtime-log-submission',
    setup(bundler) {
      bundler.onResolve({ filter: /^vue$/ }, () => ({ path: require.resolve('vue/dist/vue.runtime.esm-bundler.js') }))
      bundler.onResolve({ filter: /\/useRuntimeLog$/ }, () => ({ path: 'state', namespace: 'fixture' }))
      bundler.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
        contents: 'export const useRuntimeLog=()=>globalThis.__logSubmission.state', loader: 'js',
      }))
      bundler.onLoad({ filter: /\.vue$/ }, args => {
        if (args.path !== entry) return { contents: 'export default {render:()=>null}', loader: 'js' }
        const { descriptor } = parse(readFileSync(entry, 'utf8'))
        return { contents: compileScript(descriptor, { id: 'log-submission', inlineTemplate: true }).content, loader: 'ts' }
      })
    },
  }],
})
const temporary = mkdtempSync(path.join(tmpdir(), 'log-submission-'))
const bundledFile = path.join(temporary, 'submission.mjs')
writeFileSync(bundledFile, result.outputFiles[0].text)
const api = await import(pathToFileURL(bundledFile).href)
unlinkSync(bundledFile)
rmdirSync(temporary)

const renderer = api.createRenderer({
  patchProp(node, key, previous, value) { node.props[key] = value },
  insert(node, parent) { parent.children.push(node); node.parent = parent },
  remove(node) { if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1) },
  setElementText(node, text) { node.text = text }, setText(node, text) { node.text = text },
  createElement: tag => ({ tag, props: {}, children: [] }),
  createText: () => ({ props: {}, children: [] }), createComment: () => ({ props: {}, children: [] }),
  parentNode: node => node.parent, nextSibling: () => null,
})
const find = (node, predicate) => predicate(node) ? node : node.children.map(child => find(child, predicate)).find(Boolean)

test('the actual Ant Design form submits current log filters without a form model', async () => {
  const queries = []
  const state = {
    canRead: api.ref(true), canSubscribe: api.ref(false), resource: api.ref({ name: 'server.log' }),
    canDownload: api.ref(false), validLineCount: api.ref(true), supportsFilter: () => true,
    lineCount: api.ref(500), keyword: api.ref(''), levels: api.ref([]), regex: api.ref(''),
    lines: api.ref([]), hasRead: api.ref(false),
    query() { queries.push({ lineCount: state.lineCount.value, keyword: state.keyword.value, levels: [...state.levels.value], regex: state.regex.value }) },
  }
  globalThis.__logSubmission = { state }
  const app = renderer.createApp(api.Panel, { embedded: true })
  app.component('a-form', api.Form)
  // 只替换展示控件；表单的 submit/finish 分发保留真实组件实现。
  for (const name of ['a-form-item', 'a-select', 'a-input-number', 'a-input', 'a-button', 'a-tooltip', 'a-space', 'a-spin', 'CloudEmpty', 'a-alert', 'a-tag', 'j-permission-button', 'AIcon']) {
    app.component(name, { setup: (_, { attrs, slots }) => () => api.h(name, attrs, slots.default?.()) })
  }
  app.config.globalProperties.$t = key => key
  const root = { props: {}, children: [] }
  app.mount(root)
  const update = (tag, predicate, value) => {
    const control = find(root, node => node.tag === tag && predicate(node.props))
    assert.ok(control)
    control.props['onUpdate:value'](value)
  }
  update('a-input-number', () => true, 100)
  update('a-input', props => props.placeholder === 'runtimeLog.keywordHint', 'timeout')
  update('a-select', props => props.mode === 'multiple', ['WARN'])
  update('a-input', props => props.placeholder === 'runtimeLog.regexHint', 'connection.*')
  await api.nextTick()
  const form = find(root, node => node.tag === 'form' && node.props.class.includes('runtime-log-page__filters'))
  const button = find(form, node => node.tag === 'a-button' && node.props.type === 'primary')
  assert.equal(button.props['html-type'] || button.props.htmlType, 'submit')
  form.props.onSubmit({ preventDefault() {}, stopPropagation() {} })
  await api.nextTick()
  assert.deepEqual(queries, [{ lineCount: 100, keyword: 'timeout', levels: ['WARN'], regex: 'connection.*' }])
  app.unmount()
})
