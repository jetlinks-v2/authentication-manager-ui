import assert from 'node:assert/strict'
import test from 'node:test'
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
globalThis.__liveLogFixture = {
  observers: [], delayed: [],
  nodes: [{ id: 'edge-1', current: true }],
  providers: [{ id: 'java', name: '运行日志', rootId: 'root' }],
  resources: [],
}
const fixture = globalThis.__liveLogFixture
const result = await build({
  stdin: {
    contents: "export { useRuntimeLog } from './useRuntimeLog'; export { formatRuntimeLogEvent } from './runtimeLogEvent'; export { createRenderer, nextTick } from 'vue'",
    resolveDir: fileURLToPath(new URL('.', import.meta.url)),
  },
  bundle: true, write: false, platform: 'browser', format: 'esm',
  define: { __VUE_OPTIONS_API__: 'true', __VUE_PROD_DEVTOOLS__: 'false', __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false' },
  plugins: [{
    name: 'live-log-contract',
    setup(bundler) {
      bundler.onResolve({ filter: /^vue$/ }, () => ({ path: require.resolve('vue/dist/vue.runtime.esm-bundler.js') }))
      bundler.onResolve({ filter: /^(@jetlinks-web\/core|@jetlinks-web\/utils|vue-i18n|@authentication-manager-ui\/api\/runtimeLog)$/ },
        args => ({ path: args.path, namespace: 'fixture' }))
      bundler.onLoad({ filter: /.*/, namespace: 'fixture' }, args => {
        if (args.path === 'vue-i18n') return { contents: 'export const useI18n = () => ({t: key => key})', loader: 'js' }
        if (args.path === '@jetlinks-web/utils') return { contents: 'export const randomString = () => String(Math.random()); export const downloadFileByUrl = () => {}', loader: 'js' }
        if (args.path === '@jetlinks-web/core') return {
          contents: `export const wsClient = {getWebSocket(id,topic,params){return {subscribe(observer){
            const sub={closed:false,unsubscribe(){this.closed=true}};
            globalThis.__liveLogFixture.observers.push({observer,topic,params,sub}); return sub;
          }}}}`, loader: 'js',
        }
        return {
          contents: `const f=globalThis.__liveLogFixture;
            export const getRuntimeLogNodes=async()=>f.nodes;
            export const getRuntimeLogProviders=async()=>f.providers;
            export const getRuntimeLogResources=async()=>f.resources;
            export const readRuntimeLog=async()=>({lines:[]});
            export const downloadRuntimeLog=async()=>({});
            export const runtimeLogErrorMessage=error=>new Promise(resolve=>f.delayed.push(()=>resolve(error.message)));`,
          loader: 'js',
        }
      })
    },
  }],
})
const api = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'))

test('Java log events preserve multiline messages and exception stacks', () => {
  const event = api.formatRuntimeLogEvent({
    level: 'ERROR', message: 'message\nsecond line', exceptionStack: 'Traceback\n  detail',
  })
  assert.equal(event.text, 'ERROR\nmessage\nsecond line\nTraceback\n  detail')
})

test('late callbacks cannot replace the new Java log subscription and unmount releases it', async () => {
  const renderer = api.createRenderer({
    patchProp() {}, insert() {}, remove() {}, setElementText() {}, setText() {},
    createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    parentNode: () => null, nextSibling: () => null,
  })
  let state
  const app = renderer.createApp({ setup() { state = api.useRuntimeLog(); return () => null } })
  app.mount({})
  for (let i = 0; i < 5; i++) { await api.nextTick(); await Promise.resolve() }
  assert.equal(state.resourceId.value, 'runtime')
  await state.query()
  const first = fixture.observers.at(-1)
  assert.equal(first.topic, '/system/log/edge-1/java/runtime')
  const oldError = first.observer.error({ message: 'stale failure' })
  await state.query()
  const current = fixture.observers.at(-1)
  assert.equal(first.sub.closed, true)
  fixture.delayed.shift()()
  await oldError
  first.observer.complete()
  first.observer.next({ payload: { message: 'stale log' } })
  assert.equal(state.streamError.value, '')
  assert.equal(state.streamState.value, 'waiting')
  assert.equal(state.liveEntries.value.length, 0)
  current.observer.next({ payload: { level: 'WARN', message: 'current log' } })
  assert.match(state.liveEntries.value[0].text, /current log/)
  app.unmount()
  assert.equal(current.sub.closed, true)
})
