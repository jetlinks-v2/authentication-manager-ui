import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { build } from 'esbuild'
import { parse, compileScript } from 'vue/compiler-sfc'
import { buildApplicationConfiguration, buildInitialApplicationConfiguration } from '../views/application-center/ProjectApplication/applicationConfiguration.ts'
import { applyApplicationScopeHeaders } from '../../../jetlinks-web-core/src/utils/application-scope.ts'

const redirectApiBuild = await build({
  entryPoints: [new URL('../api/application-center/businessApplication.ts', import.meta.url).pathname],
  bundle: true, write: false, format: 'esm',
  plugins: [{
    name: 'redirect-request-fixture',
    setup(plugin) {
      plugin.onResolve({ filter: /^@jetlinks-web\/core$/ }, args => ({ path: args.path, namespace: 'request' }))
      plugin.onLoad({ filter: /.*/, namespace: 'request' }, () => ({
        contents: 'export const request = { get: (...args) => globalThis.redirectRequest(...args) }',
      }))
    },
  }],
})
const { getBusinessApplicationRedirect } = await import(`data:text/javascript;base64,${Buffer.from(redirectApiBuild.outputFiles[0].text).toString('base64')}`)

test('redirect uses the same login identity without inherited page scopes or query options', async () => {
  let captured
  globalThis.redirectRequest = async (url, params, options = {}) => {
    const headers = { 'x-asset-scope': 'business_application:current-app', 'X-Access-Token': 'session' }
    applyApplicationScopeHeaders(headers, options.applicationScope, 'current-app')
    captured = { url, params, headers, options }
    return { result: { location: 'https://training.example/ui/?code=one-time-code' } }
  }
  try {
    await getBusinessApplicationRedirect('training/app')
    assert.equal(captured.url, '/business-application/training%2Fapp/_redirect')
    assert.equal(captured.params, undefined)
    assert.equal(captured.options.tenantDomain, false)
    assert.equal(captured.options.projectContext, undefined)
    assert.deepEqual(captured.headers, { 'X-Access-Token': 'session' })
  } finally {
    delete globalThis.redirectRequest
  }
})

const { outputFiles } = await build({
  entryPoints: [new URL('../views/application-center/ProjectApplication/useApplicationOpenGuard.ts', import.meta.url).pathname],
  bundle: true, write: false, format: 'esm',
  plugins: [{
    name: 'application-open-fixture',
    setup(plugin) {
      plugin.onResolve({ filter: /^(vue|vue-i18n|@jetlinks-web|\.\/applicationAccessService)|businessApplication$/ }, args => ({ path: args.path, namespace: 'fixture' }))
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `
        export const ref = value => ({ value });
        export const useI18n = () => ({ t: value => value });
        export const onlyMessage = (...args) => globalThis.openFixture.message(...args);
        export const getApplicationAccessContext = () => ({});
        export const prepareApplicationAccess = () => globalThis.openFixture.prepare();
        export const getBusinessApplicationRedirect = id => globalThis.openFixture.redirect(id);
        export const hasOwnBusinessApplicationMenu = id => globalThis.openFixture.menu(id);
        export const ensureBusinessApplicationMembership = id => globalThis.openFixture.membership(id);
      ` }))
    },
  }],
})
const { useApplicationOpenGuard } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`)

const modelBuild = await build({
  entryPoints: [new URL('../views/application-center/ProjectApplication/applicationModel.ts', import.meta.url).pathname],
  bundle: true, write: false, format: 'esm',
  plugins: [{
    name: 'application-model-fixture',
    setup(plugin) {
      plugin.onResolve({ filter: /^(dayjs|@jetlinks-web-core\/layout\/runtime\/layoutVariant)$/ }, args => ({ path: args.path, namespace: 'fixture' }))
      plugin.onLoad({ filter: /^dayjs$/, namespace: 'fixture' }, () => ({ contents: `export default () => ({ format: () => '' })` }))
      plugin.onLoad({ filter: /layoutVariant$/, namespace: 'fixture' }, () => ({ contents: `export const normalizeBasicLayoutVariant = value => value` }))
    },
  }],
})
const { normalizeTemplate, normalizeApplication } = await import(`data:text/javascript;base64,${Buffer.from(modelBuild.outputFiles[0].text).toString('base64')}`)

const settingsUrl = new URL('../views/application-center/ProjectApplication/Detail/components/ApplicationSettings.vue', import.meta.url)
const { descriptor: settingsDescriptor } = parse(await readFile(settingsUrl, 'utf8'))
const settingsBuild = await build({
  stdin: { contents: compileScript(settingsDescriptor, { id: 'application-settings' }).content, resolveDir: new URL('.', settingsUrl).pathname, loader: 'ts' },
  bundle: true, write: false, format: 'esm',
  plugins: [{
    name: 'application-settings-fixture',
    setup(plugin) {
      plugin.onResolve({ filter: /^(vue-i18n|@jetlinks-web)/ }, args => ({ path: args.path, namespace: 'fixture' }))
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `
        export const useI18n = () => ({ t: value => value });
        export const onlyMessage = () => {};
        export const createApplicationAccessDisplayUrl = id => '/' + id;
      ` }))
    },
  }],
})
const { default: settingsComponent } = await import(`data:text/javascript;base64,${Buffer.from(settingsBuild.outputFiles[0].text).toString('base64')}`)

function createSettingsFixture(override) {
  const patches = []
  const bindings = settingsComponent.setup({
    data: {
      application: { id: 'app', name: 'Training', description: '', defaultLanguage: 'zh-CN', redirectUri: override },
      template: { provider: 'third-party', description: '', redirectUri: 'https://template.example/ui' },
    }, editing: false, saving: false,
  }, { expose() {}, emit: (event, patch) => { if (event === 'save') patches.push(patch) } })
  bindings.startEdit()
  return { bindings, patches }
}

test('editing fills the effective template address without saving an unchanged inherited value', async () => {
  const { bindings, patches } = createSettingsFixture()
  assert.equal(bindings.draft.redirectUri, 'https://template.example/ui')
  await bindings.saveSettings()
  assert.equal(Object.hasOwn(patches[0], 'redirectUri'), false)
  bindings.draft.redirectUri = ' https://instance.example/ui '
  await bindings.saveSettings()
  assert.equal(patches[1].redirectUri, 'https://instance.example/ui')
})

test('editing fills an instance override and clearing it still restores template inheritance', async () => {
  const { bindings, patches } = createSettingsFixture('https://instance.example/ui')
  assert.equal(bindings.draft.redirectUri, 'https://instance.example/ui')
  bindings.draft.redirectUri = ''
  await bindings.saveSettings()
  assert.equal(patches[0].redirectUri, '')
})

const homeBuild = await build({
  entryPoints: [new URL('../visDashboard/Base/shared/api.ts', import.meta.url).pathname],
  bundle: true, write: false, format: 'esm',
  plugins: [{
    name: 'home-application-fixture',
    setup(plugin) {
      plugin.onResolve({ filter: /^(dayjs|@authentication-manager-ui\/api\/application-center\/businessApplication|@jetlinks-web-core\/layout\/runtime\/layoutVariant|\.\/api(Announcements|Resources|Quotas)|\.\.\/QuickGuide\/apiQuickGuide)$/ }, args => ({ path: args.path, namespace: 'fixture' }))
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `
        export default () => ({ format: () => '', isValid: () => true });
        export const normalizeBasicLayoutVariant = value => value;
        export const queryBusinessApplications = () => globalThis.homeFixture.applications();
        export const queryBusinessApplicationTemplates = () => globalThis.homeFixture.templates();
        export const loadAnnouncements = () => [];
        export const loadResourceRows = () => [];
        export const loadOperationRows = () => [];
        export const loadHealthRows = () => [];
        export const loadQuotaRows = () => [];
        export const loadQuickGuideRows = () => [];
      ` }))
    },
  }],
})
const { loadHomeRows } = await import(`data:text/javascript;base64,${Buffer.from(homeBuild.outputFiles[0].text).toString('base64')}`)

const validUrls = ['http://training.example/ui/', 'HTTPS://training.example/ui/?page=dashboard#home']
const invalidUrls = ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'file:///etc/hosts', '/training', '//training.example/ui/', 'http:training.example', 'https:/training.example', 'https://', 'https://user:password@training.example/ui']
const application = { id: 'training', name: 'Training', provider: 'third-party' }

function createFixture(overrides = {}) {
  const calls = []
  const popup = { opener: {}, closed: false, location: { replace: url => calls.push(['navigate', url]) }, close: () => calls.push(['close']) }
  globalThis.window = { open: (...args) => { calls.push(['window', ...args]); return popup } }
  globalThis.openFixture = {
    message: (...args) => calls.push(['message', ...args]),
    membership: async id => { calls.push(['membership', id]); return false },
    menu: async id => { calls.push(['menu', id]); return true },
    redirect: async id => { calls.push(['redirect', id]); return { result: { location: 'https://training.example/ui/?page=dashboard#home' } } },
    prepare: () => { calls.push(['runtime']); return { success: true, url: '/runtime' } },
    ...overrides,
  }
  return { calls, popup, guard: useApplicationOpenGuard() }
}

test('does not copy redirect or legacy instance fields when creating an application', () => {
  const configuration = buildInitialApplicationConfiguration({ layoutVariant: 'application', layout: 'side', provider: 'third-party', redirectUri: 'https://training.example/ui/' })
  for (const field of ['openMode', 'externalUrl', 'redirectUri']) assert.equal(Object.hasOwn(configuration, field), false)
})

test('round trips an instance override and allows clearing it while retaining unrelated configuration', () => {
  const current = { redirectUri: 'https://instance.example/ui', retained: 'value' }
  const application = normalizeApplication({ id: 'app', templateId: 'template', configuration: current }, { provider: 'third-party' })
  assert.equal(application.redirectUri, current.redirectUri)
  assert.deepEqual(buildApplicationConfiguration(current, { ...application, redirectUri: ' https://other.example/ui ' }), {
    redirectUri: 'https://other.example/ui', retained: 'value',
  })
  assert.deepEqual(buildApplicationConfiguration(current, { ...application, redirectUri: '' }), {
    redirectUri: '', retained: 'value',
  })
})

test('uses template provider and redirect configuration instead of instance openMode', () => {
  const template = normalizeTemplate({ id: 'training-template', name: 'Training', code: 'Training', state: 'enabled', provider: 'third-party', configuration: { redirectUri: 'https://training.example/ui/' } })
  assert.equal(template.status, 'enabled')
  assert.equal(template.disabled, false)
  assert.equal(template.provider, 'third-party')
  assert.equal(template.redirectUri, 'https://training.example/ui/')
  const entity = { id: 'app', templateId: template.id, name: 'Training', configuration: { openMode: 'runtime', externalUrl: 'javascript:alert(1)' } }
  assert.equal(normalizeApplication(entity, template).provider, 'third-party')
  assert.equal(Object.hasOwn(normalizeApplication(entity, template), 'externalUrl'), false)
  assert.equal(normalizeApplication({ ...entity, configuration: { openMode: 'external' } }, { ...template, provider: 'official' }).provider, 'official')
})

test('preserves unknown instance configuration without adding legacy redirect fields', () => {
  const result = buildApplicationConfiguration({ retained: 'value' }, { defaultLanguage: 'zh-CN', timezone: 'Asia/Shanghai', domain: '' })
  assert.equal(result.retained, 'value')
  assert.equal(Object.hasOwn(result, 'openMode'), false)
  assert.equal(Object.hasOwn(result, 'externalUrl'), false)
})

test('uses GET _redirect and does not expose instance open-mode or external-url editors', async () => {
  const api = await readFile(new URL('../api/application-center/businessApplication.ts', import.meta.url), 'utf8')
  const settings = await readFile(new URL('../views/application-center/ProjectApplication/Detail/components/ApplicationSettings.vue', import.meta.url), 'utf8')
  assert.match(api, /apiRequest\.get<\{ location: string \}>\([\s\S]*?\/_redirect/)
  assert.doesNotMatch(api, /external-url/)
  assert.doesNotMatch(settings, /draft\.(openMode|externalUrl)/)
})

test('opens the template redirect location after membership validation', async () => {
  const { calls, popup, guard } = createFixture()
  assert.equal(await guard.openApplication(application), true)
  assert.deepEqual(calls.map(call => call[0]), ['window', 'membership', 'redirect', 'navigate'])
  assert.equal(popup.opener, null)
  assert.deepEqual(calls[2], ['redirect', 'training'])
  assert.deepEqual(calls[3], ['navigate', 'https://training.example/ui/?page=dashboard#home'])
})

test('opens backend-generated third-party parameters and fragment without rewriting the location', async () => {
  const location = 'https://training.example/ui/?page=dashboard&test_key=abc%40123&test_user_id=user%2F001&test_username=%E8%80%81%E5%91%A8%20%26%20dev%2Bops#home'
  const { calls, guard } = createFixture({ redirect: async () => ({ result: { location } }) })
  assert.equal(await guard.openApplication(application), true)
  assert.deepEqual(calls.at(-1), ['navigate', location])
})

test('closes the reserved window when redirect loading fails', async () => {
  const { calls, guard } = createFixture({ redirect: async () => { throw new Error('unauthorized') } })
  await assert.rejects(guard.openApplication(application), /unauthorized/)
  assert.deepEqual(calls.at(-1), ['close'])
  assert.deepEqual(guard.openingApplicationIds.value, [])
})

test('does not navigate when the redirect response is empty', async () => {
  const { calls, guard } = createFixture({ redirect: async () => ({ result: {} }) })
  assert.equal(await guard.openApplication(application), false)
  assert.equal(calls.some(call => call[0] === 'navigate'), false)
  assert.deepEqual(calls.at(-1), ['close'])
})

test('navigates to valid HTTP and HTTPS locations', async () => {
  for (const location of validUrls) {
    const { calls, guard } = createFixture({ redirect: async () => ({ result: { location } }) })
    assert.equal(await guard.openApplication(application), true)
    assert.deepEqual(calls.at(-1), ['navigate', location])
  }
})

test('does not navigate to non-http, relative or malformed locations', async () => {
  for (const location of invalidUrls) {
    const { calls, guard } = createFixture({ redirect: async () => ({ result: { location } }) })
    assert.equal(await guard.openApplication(application), false)
    assert.equal(calls.some(call => call[0] === 'navigate'), false)
    assert.deepEqual(calls.at(-2), ['message', 'ProjectApplication.detail.accessFailed', 'warning'])
    assert.deepEqual(calls.at(-1), ['close'])
    assert.deepEqual(guard.openingApplicationIds.value, [])
  }
})

test('third-party applications do not require a Runtime application menu', async () => {
  const { calls, guard } = createFixture()
  assert.equal(await guard.openApplication(application), true)
  assert.equal(calls.some(call => call[0] === 'menu'), false)
})

test('internal applications retain Runtime access regardless of legacy openMode', async () => {
  const { calls, guard } = createFixture()
  assert.equal(await guard.openApplication({ ...application, provider: 'official', openMode: 'external' }), true)
  assert.deepEqual(calls.map(call => call[0]), ['membership', 'menu', 'runtime', 'window'])
})

test('home cards load template provider before opening and ignore legacy instance openMode', async () => {
  globalThis.homeFixture = {
    applications: async () => ({ result: [
      { id: 'external', name: 'External', templateId: 'third', configuration: { openMode: 'runtime' } },
      { id: 'internal', name: 'Internal', templateId: 'official', configuration: { openMode: 'external' } },
    ] }),
    templates: async () => ({ result: [
      { id: 'third', name: 'Third-party', provider: 'third-party', configuration: { redirectUri: 'https://training.example/' } },
      { id: 'official', name: 'Official', provider: 'official' },
    ] }),
  }
  const rows = await loadHomeRows('Applications')
  assert.equal(rows[0].application.provider, 'third-party')
  assert.equal(rows[1].application.provider, 'official')
  const { calls, guard } = createFixture()
  assert.equal(await guard.openApplication(rows[0].application), true)
  assert.equal(calls.some(call => call[0] === 'redirect'), true)
  assert.equal(calls.some(call => call[0] === 'runtime'), false)
})

test('detail and shared application list load template information even when applications finish first', async () => {
  const store = await readFile(new URL('../views/application-center/ProjectApplication/useProjectApplication.ts', import.meta.url), 'utf8')
  const detail = await readFile(new URL('../views/application-center/ProjectApplication/Detail/index.vue', import.meta.url), 'utf8')
  assert.match(store, /normalizeApplication\(entity, templates\.find/)
  assert.match(store, /replace\(applications, applications\.map/)
  assert.match(detail, /Promise\.all\(\[store\.loadTemplates\(\), store\.loadApplication\(id\)\]\)/)
})
