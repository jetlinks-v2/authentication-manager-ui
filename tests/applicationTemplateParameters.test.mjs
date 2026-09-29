import assert from 'node:assert/strict'
import test from 'node:test'
import { build } from 'esbuild'

const { outputFiles } = await build({
  stdin: {
    contents: `export { useApplicationTemplateParameters } from './views/application-center/Template/Save/useApplicationTemplateParameters'; export { ref, nextTick } from 'vue';`,
    resolveDir: new URL('..', import.meta.url).pathname,
  },
  bundle: true,
  write: false,
  format: 'esm',
  plugins: [{
    name: 'parameter-api-fixture',
    setup(plugin) {
      plugin.onResolve({ filter: /^@authentication-manager-ui\/api\// }, args => ({ path: args.path, namespace: 'fixture' }))
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
        contents: 'export const getApplicationParameterProviders = () => globalThis.parameterProviders();',
      }))
    },
  }],
})
const { useApplicationTemplateParameters, ref, nextTick } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`)
const messages = {
  loadFailed: 'load failed', invalidParameter: 'invalid parameter',
  invalidConfiguration: 'invalid configuration', saveFailed: 'save failed',
}

function fixture(parameters = []) {
  const detail = ref({ id: 'template', provider: 'third-party', configuration: { retained: 'value', externalParameters: parameters } })
  const writes = []
  const state = useApplicationTemplateParameters(() => detail.value, async configuration => {
    writes.push(configuration)
    detail.value = { ...detail.value, configuration }
    return true
  }, messages)
  return { state, writes, detail }
}

test('saves fixed and current-user rules on the template and echoes the saved values', async () => {
  const { state, writes } = fixture()
  state.add()
  Object.assign(state.draft.value[0], { name: ' page ', provider: 'fixed', value: 'dashboard & reports' })
  state.add()
  Object.assign(state.draft.value[1], {
    name: 'userId', provider: 'user', configuration: '{"field":"id"}',
  })
  assert.equal(await state.save(), true)
  await nextTick()
  assert.deepEqual(writes[0], {
    retained: 'value',
    externalParameters: [
      { name: 'page', provider: 'fixed', configuration: { value: 'dashboard & reports' } },
      { name: 'userId', provider: 'user', configuration: { field: 'id' } },
    ],
  })
  assert.equal(state.draft.value[0].name, 'page')
  assert.equal(state.draft.value[0].value, 'dashboard & reports')
})

test('preserves unknown provider configuration through echo and save', async () => {
  const parameters = [{ name: 'ticket', provider: 'custom-ticket', configuration: { audience: 'training', options: { ttl: 60 } } }]
  const { state, writes } = fixture(parameters)
  assert.equal(await state.save(), true)
  assert.deepEqual(writes[0].externalParameters, parameters)
})

test('clears all parameters explicitly while preserving other configuration', async () => {
  const { state, writes } = fixture([{ name: 'userId', provider: 'user', configuration: { field: 'id' } }])
  state.remove(0)
  assert.equal(await state.save(), true)
  assert.deepEqual(writes[0], { retained: 'value', externalParameters: [] })
})

test('reset discards edits and provider changes clear incompatible configuration', () => {
  const { state } = fixture([{ name: 'page', provider: 'fixed', configuration: { value: 'dashboard' } }])
  state.changeProvider(0, 'user')
  assert.equal(state.draft.value[0].configuration, '{}')
  assert.equal(state.draft.value[0].value, '')
  state.reset()
  assert.equal(state.draft.value[0].provider, 'fixed')
  assert.equal(state.draft.value[0].value, 'dashboard')
})

test('rejects missing and duplicate names and non-object custom configuration without saving', async () => {
  const { state, writes } = fixture()
  state.add()
  assert.equal(await state.save(), false)
  assert.equal(state.error.value, messages.invalidParameter)
  Object.assign(state.draft.value[0], { name: 'page', provider: 'custom' })
  state.add()
  Object.assign(state.draft.value[1], { name: ' page ', provider: 'fixed' })
  assert.equal(await state.save(), false)
  state.remove(1)
  for (const configuration of ['{', 'null', '[]', '1']) {
    state.draft.value[0].configuration = configuration
    assert.equal(await state.save(), false)
    assert.equal(state.error.value, messages.invalidConfiguration)
  }
  assert.deepEqual(writes, [])
})

test('loads server provider choices and allows retry after failure', async () => {
  const { state } = fixture()
  globalThis.parameterProviders = async () => { throw new Error('offline') }
  await state.loadProviders()
  assert.equal(state.loadError.value, messages.loadFailed)
  assert.equal(state.loading.value, false)
  globalThis.parameterProviders = async () => ({ result: [{ id: 'custom', name: 'Custom Ticket' }] })
  await state.loadProviders()
  assert.deepEqual(state.options.value, [{ value: 'custom', label: 'Custom Ticket' }])
  assert.equal(state.loadError.value, '')
})

test('only requests parameter providers after detail identifies a third-party template', async () => {
  const { state, detail } = fixture()
  let requests = 0
  globalThis.parameterProviders = async () => {
    requests += 1
    return { result: [{ id: 'fixed', name: 'Fixed' }] }
  }
  for (const provider of [undefined, 'official', 'custom']) {
    detail.value = { ...detail.value, provider }
    assert.equal(state.supported.value, false)
    await state.loadProviders()
  }
  assert.equal(requests, 0)
  detail.value = { ...detail.value, provider: 'third-party' }
  assert.equal(state.supported.value, true)
  await state.loadProviders()
  assert.equal(requests, 1)
  assert.deepEqual(state.options.value, [{ value: 'fixed', label: 'Fixed' }])
})

test('reports save failures without discarding the draft', async () => {
  const state = useApplicationTemplateParameters(() => ({}), async () => { throw new Error('offline') }, messages)
  state.add()
  Object.assign(state.draft.value[0], { name: 'page', provider: 'fixed', value: 'dashboard' })
  assert.equal(await state.save(), false)
  assert.equal(state.error.value, messages.saveFailed)
  assert.equal(state.saving.value, false)
  assert.equal(state.draft.value[0].value, 'dashboard')
})
