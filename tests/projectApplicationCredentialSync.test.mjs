import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { build } from 'esbuild'
import { parse, compileScript, compileTemplate } from 'vue/compiler-sfc'

const root = new URL('..', import.meta.url).pathname
const source = await readFile(new URL('../views/application-center/ProjectApplication/Detail/index.vue', import.meta.url), 'utf8')
const { descriptor } = parse(source)
const { outputFiles } = await build({
  stdin: { contents: descriptor.scriptSetup.content + '\nexport { syncCredential, syncingCredential };', resolveDir: root, loader: 'ts' },
  bundle: true, write: false, format: 'esm',
  plugins: [{
    name: 'credential-sync-fixture',
    setup(plugin) {
      plugin.onResolve({ filter: /vue-router|vue-i18n|@jetlinks|@authentication|useProjectApplication|useApplicationOpenGuard|\.vue$/ }, args => ({ path: args.path, namespace: 'fixture' }))
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `
        export default {};
        export const useRoute = () => ({ params: { id: 'app-1' } });
        export const useI18n = () => ({ t: key => key });
        export const onlyMessage = text => globalThis.syncFixture.messages.push(text);
        export const useMenuStore = () => ({});
        export const useApplicationOpenGuard = () => ({ openingApplicationIds: [] });
        export const useProjectApplication = () => ({ applications: [{ id: 'app-1', provider: 'third-party' }], details: {}, templates: [],
          loadTemplates: async () => {}, loadApplication: async () => {}, loadDetail: async () => {} });
        export const syncBusinessApplicationCredential = id => globalThis.syncFixture.submit(id);
      ` }))
    },
  }],
})
const page = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`)

test('sync blocks duplicate submissions and reports reliable acceptance', async () => {
  let complete
  const calls = []
  globalThis.syncFixture = { messages: [], submit: id => {
    calls.push(id)
    return new Promise(resolve => { complete = resolve })
  } }
  const pending = page.syncCredential()
  assert.equal(page.syncingCredential.value, true)
  await page.syncCredential()
  assert.deepEqual(calls, ['app-1'])
  assert.deepEqual(globalThis.syncFixture.messages, [])
  complete()
  await pending
  assert.equal(page.syncingCredential.value, false)
  assert.deepEqual(globalThis.syncFixture.messages, ['ProjectApplication.detail.credentialSyncSubmitted'])
})

test('failed submission releases loading and does not report success', async () => {
  globalThis.syncFixture = { messages: [], submit: async () => { throw new Error('forbidden') } }
  await page.syncCredential()
  assert.equal(page.syncingCredential.value, false)
  assert.deepEqual(globalThis.syncFixture.messages, [])
})

test('summary compiles with the existing edit permission and submission guard', async () => {
  const summary = await readFile(new URL('../views/application-center/ProjectApplication/Detail/components/ApplicationSummary.vue', import.meta.url), 'utf8')
  const { descriptor: component } = parse(summary)
  const script = compileScript(component, { id: 'credential-sync-summary' })
  const compiled = compileTemplate({ source: component.template.content, filename: 'ApplicationSummary.vue', id: 'credential-sync-summary', compilerOptions: { bindingMetadata: script.bindings } })
  assert.deepEqual(compiled.errors, [])
  assert.match(summary, /hasPermission="application-center\/ProjectApplication:update"/)
  assert.match(summary, /:disabled="deleting \|\| syncingCredential"/)
  assert.match(summary, /@click="emits\('sync-credential'\)"/)
})
