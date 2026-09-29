import assert from 'node:assert/strict'
import test from 'node:test'
import { build } from 'esbuild'
import {
  buildApplicationConfiguration,
  buildInitialApplicationConfiguration,
  normalizeApplicationOpenConfiguration,
} from '../views/application-center/ProjectApplication/applicationConfiguration.ts'

const { outputFiles } = await build({
  entryPoints: [new URL('../views/application-center/ProjectApplication/useApplicationOpenGuard.ts', import.meta.url).pathname],
  bundle: true,
  write: false,
  format: 'esm',
  plugins: [{
    name: 'application-open-fixture',
    setup(plugin) {
      plugin.onResolve({ filter: /^(vue|vue-i18n|@jetlinks-web|\.\/applicationAccessService)|businessApplication$/ }, args => ({ path: args.path, namespace: 'fixture' }))
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `
        export const ref = value => ({ value });
        export const useI18n = () => ({ t: value => value });
        export const useUserStore = () => globalThis.openFixture.user;
        export const onlyMessage = (...args) => globalThis.openFixture.message(...args);
        export const getApplicationAccessContext = () => ({});
        export const prepareApplicationAccess = () => globalThis.openFixture.prepare();
        export const getBusinessApplicationExternalUrl = id => globalThis.openFixture.externalUrl(id);
        export const ensureBusinessApplicationOpenAccess = (...args) => globalThis.openFixture.access(...args);
        export const bindSelectedBusinessApplicationRole = async () => {};
        export const ensureBusinessApplicationMembership = async () => false;
      ` }))
    },
  }],
})
const { useApplicationOpenGuard } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`)

const modelBuild = await build({
  entryPoints: [new URL('../views/application-center/ProjectApplication/applicationModel.ts', import.meta.url).pathname],
  bundle: true,
  write: false,
  format: 'esm',
  plugins: [{
    name: 'application-model-fixture',
    setup(plugin) {
      plugin.onResolve({ filter: /^(dayjs|@jetlinks-web-core\/layout\/runtime\/layoutVariant)$/ }, args => ({ path: args.path, namespace: 'fixture' }))
      plugin.onLoad({ filter: /^dayjs$/, namespace: 'fixture' }, () => ({ contents: `export default () => ({ format: () => '' })` }))
      plugin.onLoad({ filter: /layoutVariant$/, namespace: 'fixture' }, () => ({ contents: `export const normalizeBasicLayoutVariant = value => value` }))
    },
  }],
})
const { normalizeTemplate } = await import(`data:text/javascript;base64,${Buffer.from(modelBuild.outputFiles[0].text).toString('base64')}`)

const application = {
  id: 'training',
  name: 'Training',
  openMode: 'external',
  externalUrl: 'https://training.example/ui/?page=dashboard',
}

function createFixture(overrides = {}) {
  const calls = []
  const popup = { opener: {}, closed: false, location: { replace: url => calls.push(['navigate', url]) }, close: () => calls.push(['close']) }
  globalThis.window = { open: (...args) => { calls.push(['window', ...args]); return popup } }
  globalThis.openFixture = {
    user: { userInfo: { id: 'user' }, isAdmin: false },
    message: (...args) => calls.push(['message', ...args]),
    access: async (...args) => { calls.push(['access', ...args]); return { type: 'ready', changed: false } },
    externalUrl: async id => { calls.push(['externalUrl', id]); return { result: { url: 'https://training.example/ui/?page=dashboard&login=tenant-token' } } },
    prepare: () => { calls.push(['runtime']); return { success: true, url: '/runtime/#/?applicationScope=runtime' } },
    ...overrides,
  }
  return { calls, popup, guard: useApplicationOpenGuard() }
}

test('maps the upstream URL into the page model', () => {
  assert.deepEqual(normalizeApplicationOpenConfiguration(), {
    openMode: 'runtime', externalUrl: '',
  })
  assert.deepEqual(normalizeApplicationOpenConfiguration({
    openMode: 'external', externalUrl: ' https://training.example/ui/?page=dashboard ',
  }), { openMode: 'external', externalUrl: 'https://training.example/ui/?page=dashboard' })
})

test('uses the template open mode when creating an application', () => {
  assert.equal(buildInitialApplicationConfiguration().openMode, 'runtime')
  const external = buildInitialApplicationConfiguration({
    layoutVariant: 'application',
    layout: 'side',
    openMode: 'external',
  })
  assert.equal(external.openMode, 'external')
  assert.equal(external.externalUrl, '')
})

test('normalizes the template open mode without a runtime reference error', () => {
  const template = normalizeTemplate({
    id: 'training-template',
    name: 'Training',
    code: 'Training',
    state: 'enabled',
    configuration: { openMode: 'external' },
  })
  assert.equal(template.status, 'enabled')
  assert.equal(template.disabled, false)
  assert.equal(template.openMode, 'external')
})

test('submits the edited external URL with the rest of the configuration', () => {
  const fields = {
    defaultLanguage: 'zh-CN',
    timezone: 'Asia/Shanghai',
    domain: '',
    openMode: 'external',
    externalUrl: ' https://training.example/ui/?page=dashboard ',
  }
  const result = buildApplicationConfiguration({ retained: 'value' }, fields)
  assert.equal(result.retained, 'value')
  assert.equal(result.externalUrl, 'https://training.example/ui/?page=dashboard')
})

test('prompts without opening or checking access when an external URL is not configured', async () => {
  const { calls, guard } = createFixture()
  assert.equal(await guard.openApplication({ ...application, externalUrl: '' }), false)
  assert.deepEqual(calls, [['message', 'ProjectApplication.settings.externalUrlRequired', 'warning']])
  assert.deepEqual(guard.openingApplicationIds.value, [])
})

test('opens the dynamic external URL after membership validation', async () => {
  const { calls, popup, guard } = createFixture()
  assert.equal(await guard.openApplication(application), true)
  assert.deepEqual(calls.map(call => call[0]), ['window', 'access', 'externalUrl', 'navigate'])
  assert.equal(popup.opener, null)
  assert.deepEqual(calls[2], ['externalUrl', 'training'])
  assert.deepEqual(calls[3], ['navigate', 'https://training.example/ui/?page=dashboard&login=tenant-token'])
})

test('closes the reserved window when external URL loading fails', async () => {
  const { calls, guard } = createFixture({ externalUrl: async () => { throw new Error('unauthorized') } })
  await assert.rejects(guard.openApplication(application), /unauthorized/)
  assert.deepEqual(calls.at(-1), ['close'])
  assert.deepEqual(guard.openingApplicationIds.value, [])
})

test('does not navigate when the external URL response is empty', async () => {
  const { calls, guard } = createFixture({ externalUrl: async () => ({ result: {} }) })
  assert.equal(await guard.openApplication(application), false)
  assert.equal(calls.some(call => call[0] === 'navigate'), false)
  assert.deepEqual(calls.at(-1), ['close'])
})

test('role selection requests no external URL until the user confirms a role', async () => {
  const { calls, guard } = createFixture({ access: async () => ({ type: 'select-role', roles: [{ id: 'role' }], selection: {} }) })
  assert.equal(await guard.openApplication(application), false)
  assert.equal(guard.roleSelectOpen.value, true)
  assert.equal(calls.some(call => call[0] === 'externalUrl'), false)
  await guard.confirmSelectedRole('role')
  assert.deepEqual(calls.at(-1), ['navigate', 'https://training.example/ui/?page=dashboard&login=tenant-token'])
  assert.equal(guard.roleSelectOpen.value, false)
})

test('internal applications retain Runtime access preparation without an external URL request', async () => {
  const { calls, guard } = createFixture()
  assert.equal(await guard.openApplication({ ...application, openMode: 'runtime' }), true)
  assert.deepEqual(calls.map(call => call[0]), ['access', 'runtime', 'window'])
})
