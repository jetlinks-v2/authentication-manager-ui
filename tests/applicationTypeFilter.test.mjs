import assert from 'node:assert/strict'
import test, { beforeEach } from 'node:test'
import { readFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { parse, compileScript } from 'vue/compiler-sfc'

const moduleRoot = fileURLToPath(new URL('..', import.meta.url))
const coreRoot = fileURLToPath(new URL('../../../jetlinks-web-core/src/', import.meta.url))
const fixtures = {
  'test-runtime': `
    import { createI18n } from 'vue-i18n';
    import zh from ${JSON.stringify(`${moduleRoot}/locales/lang/zh.json`)};
    import en from ${JSON.stringify(`${moduleRoot}/locales/lang/en.json`)};
    export const i18n = createI18n({ legacy: false, locale: 'zh', messages: { zh, en }, missingWarn: false, fallbackWarn: false });
    export const api = { applications: [], templates: [], queryApplications: async () => ({ result: [] }), queryTemplates: async () => ({ result: [] }) };
  `,
  '@jetlinks-web-core/locales': "export { i18n as default } from 'test-runtime';",
  '@jetlinks-web/utils': 'export const onlyMessage = () => {};',
  '@jetlinks-web-core/store/menu': 'export const useMenuStore = () => ({ jumpPage() {} });',
  '@jetlinks-web-core/store/user': "export const useUserStore = () => ({ userInfo: { id: 'user' } });",
  '@jetlinks-web-core/components/AssetOwnershipCondition': "export const createAssetOwnershipField = () => ({ dataIndex: 'id' });",
  'vue-router': 'export const useRoute = () => ({ query: {} }); export const useRouter = () => ({ replace() {} });',
  './ownershipSelectors': 'export const createOwnershipCreatorSelector = () => {};',
  './useApplicationOpenGuard': "import { ref } from 'vue'; export const useApplicationOpenGuard = () => ({ openingApplicationIds: ref([]), openApplication() {} });",
  './applicationUserService': 'export const bindProjectUsersToBusinessApplication = () => {}; export const loadBusinessApplicationUsers = () => []; export const unbindProjectUsersFromBusinessApplication = () => {}; export const updateBoundBusinessApplicationUser = () => {};',
  './applicationRoleService': 'export const deleteBusinessApplicationRoleEntity = () => {}; export const loadBusinessApplicationRoles = () => []; export const saveBusinessApplicationRole = () => {};',
  '@jetlinks-web-core/components/CardBox/index.vue': "import { h } from 'vue'; export default { setup: (_, { slots }) => () => h('article', slots.content?.()) };",
  '@jetlinks-web-core/components/CardBox/CardAvatar.vue': 'export default { render: () => null };',
  '@authentication-manager-ui/api/application-center/businessApplication': `
    import { api } from 'test-runtime';
    export const queryBusinessApplications = query => { api.applications.push(structuredClone(query)); return api.queryApplications(query); };
    export const queryBusinessApplicationTemplates = query => { api.templates.push(structuredClone(query)); return api.queryTemplates(query); };
    export const createBusinessApplication = async () => ({});
    export const deleteBusinessApplication = async () => {};
    export const getBusinessApplication = async () => ({});
    export const getBusinessApplicationTemplateMenus = async () => ({});
    export const updateBusinessApplication = async () => ({});
  `,
}
const { outputFiles } = await build({
  stdin: {
    contents: `
      export * from './views/application-center/ProjectApplication/applicationModel';
      export { useProjectApplication } from './views/application-center/ProjectApplication/useProjectApplication';
      export { useApplicationList } from './views/application-center/ProjectApplication/useApplicationList';
      export { default as Card } from './views/application-center/ProjectApplication/components/ApplicationCard.vue';
      export { api, i18n } from 'test-runtime';
    `,
    resolveDir: moduleRoot,
  },
  bundle: true, write: false, format: 'esm',
  plugins: [{ name: 'application-type-boundaries', setup(plugin) {
    plugin.onResolve({ filter: /^(vue|vue-i18n)$/ }, args => ({ path: import.meta.resolve(args.path), external: true }))
    plugin.onResolve({ filter: /.*/ }, args => Object.hasOwn(fixtures, args.path) ? { path: args.path, namespace: 'fixture' } : undefined)
    plugin.onResolve({ filter: /^@jetlinks-web-core\/layout\/runtime\/layoutVariant$/ }, () => ({ path: `${coreRoot}/layout/runtime/layoutVariant.ts` }))
    plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: fixtures[args.path], resolveDir: moduleRoot }))
    plugin.onLoad({ filter: /\.vue$/ }, async args => {
      const { descriptor } = parse(await readFile(args.path, 'utf8'), { filename: args.path })
      return { contents: compileScript(descriptor, { id: args.path, inlineTemplate: true }).content, loader: 'ts', resolveDir: dirname(args.path) }
    })
  }}],
})
const { buildApplicationTerms, hasApplicationProviderFilter, useProjectApplication, useApplicationList, Card, api, i18n } = await import(
  `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`,
)
const store = useProjectApplication()
const templateRows = [
  { id: 'business', name: '内部模板', code: 'business', provider: 'official' },
  { id: 'third', name: '外部模板', code: 'third', provider: 'third-party' },
  { id: 'legacy', name: '历史模板', code: 'legacy' },
  { id: 'empty', name: '空类型模板', code: 'empty', provider: '' },
  { id: 'custom', name: '扩展模板', code: 'custom', provider: 'custom' },
]
const typeFilter = (value, termType = 'in') => ({ terms: [{ column: 'provider', termType, value }] })
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
beforeEach(() => {
  store.applications.splice(0)
  store.templates.splice(0)
  api.applications.length = 0
  api.templates.length = 0
  api.queryApplications = async () => ({ result: [] })
  api.queryTemplates = async () => ({ result: templateRows })
  i18n.global.locale.value = 'zh'
})

test('maps both application types and historical blank providers to template IDs', () => {
  for (const [value, ids] of [
    [['official'], ['business', 'legacy', 'empty']],
    [['third-party'], ['third']],
    [['official', 'third-party'], ['business', 'third', 'legacy', 'empty']],
    ['third-party', ['third']],
  ]) assert.deepEqual(buildApplicationTerms(typeFilter(value), templateRows), [{ column: 'templateId', termType: 'in', value: ids }])
})

test('preserves exclusions and expresses an empty template match without an empty IN', () => {
  assert.deepEqual(buildApplicationTerms(typeFilter(['third-party'], 'nin'), templateRows), [{ column: 'templateId', termType: 'nin', value: ['third'] }])
  assert.deepEqual(buildApplicationTerms(typeFilter(['third-party']), []), [{ column: 'templateId', termType: 'isnull', value: 1 }])
  assert.deepEqual(buildApplicationTerms(typeFilter(['third-party'], 'nin'), []), [{ column: 'templateId', termType: 'notnull', value: 1 }])
})

test('preserves nested AND/OR, name, status and ownership terms without mutating the filter', () => {
  const filters = { terms: [{ terms: [
    { column: 'name', termType: 'like', value: '%test%' },
    { type: 'or', terms: [{ column: 'provider', termType: 'in', value: ['third-party'] }, { type: 'and', column: 'state', termType: 'eq', value: 'enabled' }] },
  ] }, { type: 'and', column: 'id', termType: 'assets', value: { creator: 'user' } }] }
  const original = structuredClone(filters)
  const expected = structuredClone(filters.terms)
  expected[0].terms[1].terms[0] = { column: 'templateId', termType: 'in', value: ['third'] }
  assert.equal(hasApplicationProviderFilter(filters.terms), true)
  assert.deepEqual(buildApplicationTerms(filters, templateRows), expected)
  assert.deepEqual(filters, original)
  assert.equal(hasApplicationProviderFilter([{ terms: [{ column: 'state', termType: 'eq', value: 'enabled' }] }]), false)
})

test('card text and real list filter options agree in Chinese and English', async () => {
  for (const locale of ['zh', 'en']) {
    i18n.global.locale.value = locale
    let list
    const host = createSSRApp({ setup() { list = useApplicationList(); return () => null } })
    host.use(i18n)
    await renderToString(host)
    const field = list.filterFields.value.find(item => item.dataIndex === 'provider')
    assert.deepEqual(field.search.options.map(option => option.value), ['official', 'third-party'])
    assert.deepEqual(field.search.termTypeOptions, ['in', 'nin'])
    for (const template of templateRows) {
      const item = { application: { id: 'app', name: '应用', status: 'enabled', createdAt: '2026-11-11', provider: template.provider }, template }
      const app = createSSRApp(Card, { item })
      app.use(i18n)
      app.component('j-ellipsis', { setup: (_, { slots }) => () => h('span', slots.default?.()) })
      app.component('AIcon', { render: () => null })
      app.component('a-button', { render: () => null })
      const html = await renderToString(app)
      const label = field.search.options.find(option => option.value === (template.provider || 'official'))?.label || template.provider
      assert.ok(html.includes(`${label} · ${template.name}`), html)
    }
  }
})

test('type search waits for and shares the in-flight initial template load', async () => {
  const pending = deferred()
  api.queryTemplates = () => pending.promise
  api.queryApplications = async () => ({ result: [{ id: 'external', name: 'External', templateId: 'third' }] })
  const loadingTemplates = store.loadTemplates()
  const loadingApplications = store.loadApplications(typeFilter(['third-party']))
  assert.equal(api.templates.length, 1)
  assert.equal(api.applications.length, 0)
  pending.resolve({ result: templateRows })
  await Promise.all([loadingTemplates, loadingApplications])
  assert.deepEqual(api.applications[0].terms, [{ column: 'templateId', termType: 'in', value: ['third'] }])
  assert.equal(store.applications[0].provider, 'third-party')
})

test('a failed template load does not query applications and can be retried', async () => {
  api.queryTemplates = async () => { throw new Error('template unavailable') }
  await assert.rejects(store.loadApplications(typeFilter(['official'])), /template unavailable/)
  assert.equal(api.applications.length, 0)
  api.queryTemplates = async () => ({ result: templateRows })
  await store.loadApplications(typeFilter(['official']))
  assert.equal(api.templates.length, 2)
  assert.deepEqual(api.applications[0].terms[0].value, ['business', 'legacy', 'empty'])
})

test('clearing the search restores an unfiltered request without loading templates', async () => {
  await store.loadApplications(typeFilter(['third-party']))
  await store.loadApplications({ terms: [] })
  assert.equal(api.templates.length, 1)
  assert.deepEqual(api.applications.map(query => query.terms), [[{ column: 'templateId', termType: 'in', value: ['third'] }], []])
})

test('an older type search cannot overwrite a cleared search while waiting for templates', async () => {
  const pending = deferred()
  api.queryTemplates = () => pending.promise
  api.queryApplications = async () => ({ result: [{ id: 'latest', name: 'Latest', templateId: 'third' }] })
  const older = store.loadApplications(typeFilter(['official']))
  await store.loadApplications({ terms: [] })
  pending.resolve({ result: templateRows })
  await older
  assert.equal(api.applications.length, 1)
  assert.deepEqual(api.applications[0].terms, [])
  assert.deepEqual(store.applications.map(item => item.id), ['latest'])
})

test('out-of-order application responses still retain the newest type search', async () => {
  const pending = deferred()
  api.queryApplications = query => query.terms.length ? Promise.resolve({ result: [{ id: 'new', name: 'New', templateId: 'third' }] }) : pending.promise
  const older = store.loadApplications({ terms: [] })
  await store.loadApplications(typeFilter(['third-party']))
  pending.resolve({ result: [{ id: 'old', name: 'Old', templateId: 'business' }] })
  await older
  assert.deepEqual(store.applications.map(item => item.id), ['new'])
})

test('parallel initial loading fills the card provider when templates finish last', async () => {
  const pending = deferred()
  api.queryTemplates = () => pending.promise
  const loadingTemplates = store.loadTemplates()
  api.queryApplications = async () => ({ result: [{ id: 'parallel', name: 'Parallel', templateId: 'third' }] })
  await store.loadApplications({ terms: [] })
  assert.equal(store.applications[0].provider, undefined)
  pending.resolve({ result: templateRows })
  await loadingTemplates
  assert.equal(store.applications[0].provider, 'third-party')
})
