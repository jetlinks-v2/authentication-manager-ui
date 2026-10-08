import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { build } from 'esbuild'

const { outputFiles } = await build({
  stdin: {
    contents: `export { useApplicationTemplateParameters } from './views/application-center/Template/Save/useApplicationTemplateParameters'; export { ref, nextTick } from 'vue';`,
    resolveDir: new URL('..', import.meta.url).pathname,
  },
  bundle: true,
  write: false,
  format: 'esm',
})
const { useApplicationTemplateParameters, ref, nextTick } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`)
const messages = {
  saveFailed: 'save failed', redirectUriRequired: 'redirect required', redirectUriInvalid: 'invalid redirect',
  invalidParameter: 'invalid parameter',
}

function fixture(configuration = {}) {
  const detail = ref({ id: 'template', provider: 'third-party', configuration: { retained: 'value', redirectUri: 'https://training.example/ui/', ...configuration } })
  const writes = []
  const state = useApplicationTemplateParameters(() => detail.value, async value => {
    writes.push(value)
    detail.value = { ...detail.value, configuration: value }
    return true
  }, messages)
  return { state, writes, detail }
}

test('saves the edited parameters with the address and preserves all other Configuration values', async () => {
  const { state, writes } = fixture({
    externalParameters: [
      { name: 'page', provider: 'fixed', configuration: { value: 'dashboard' } },
      { name: 'test_user_id', provider: 'user', configuration: { field: 'id' } },
    ],
    parameters: { user: 'unchanged' },
  })
  state.redirectUri.value = ' https://training.example/new?page=dashboard#home '
  state.parameters.value[0].name = ' page '
  state.parameters.value[1].value = 'username'
  state.addParameter()
  state.parameters.value[2].name = 'test_key'
  state.parameters.value[2].value = 'abc@123'
  assert.equal(await state.save(), true)
  await nextTick()
  assert.deepEqual(writes[0], {
    retained: 'value', redirectUri: 'https://training.example/new?page=dashboard#home',
    externalParameters: [
      { name: 'page', provider: 'fixed', configuration: { value: 'dashboard' } },
      { name: 'test_user_id', provider: 'user', configuration: { field: 'username' } },
      { name: 'test_key', provider: 'fixed', configuration: { value: 'abc@123' } },
    ],
    parameters: { user: 'unchanged' },
  })
  assert.equal(state.redirectUri.value, 'https://training.example/new?page=dashboard#home')
  assert.equal('loadProviders' in state, false)
})

test('reset discards the address and parameter drafts', () => {
  const { state } = fixture()
  state.redirectUri.value = 'https://other.example/'
  state.addParameter()
  state.parameters.value[0].name = 'draft'
  state.reset()
  assert.equal(state.redirectUri.value, 'https://training.example/ui/')
  assert.deepEqual(state.parameters.value, [])
})

test('loads the declared redirect parameters into editable drafts', () => {
  const { state } = fixture({
    externalParameters: [
      { name: 'page', provider: 'fixed', configuration: { value: 'dashboard' } },
      { name: 'test_key', provider: 'fixed', configuration: { value: '' } },
      { name: 'test_user_id', provider: 'user', configuration: { field: 'id' } },
      { name: 'test_username', provider: 'user', configuration: { field: 'username' } },
      { name: 'legacy', provider: 'custom', configuration: { value: 10 } },
      'not-an-object',
    ],
  })
  assert.deepEqual(state.parameters.value, [
    { name: 'page', provider: 'fixed', value: 'dashboard' },
    { name: 'test_key', provider: 'fixed', value: '' },
    { name: 'test_user_id', provider: 'user', value: 'id' },
    { name: 'test_username', provider: 'user', value: 'username' },
    { name: 'legacy', provider: 'fixed', value: '10' },
  ])
  assert.deepEqual(fixture().state.parameters.value, [])

  state.parameters.value.forEach(parameter => { parameter.name = ` ${parameter.name} ` })
  state.parameters.value[0].value = 'overview'
  state.changeProvider(0, 'user')
  assert.deepEqual(state.parameters.value[0], { name: ' page ', provider: 'user', value: 'id' })
  state.changeProvider(0, 'fixed')
  assert.deepEqual(state.parameters.value[0], { name: ' page ', provider: 'fixed', value: 'id' })
  state.removeParameter(0)
  assert.equal(state.parameters.value[0].name, ' test_key ')
})

test('validates parameters before saving', async () => {
  const { state, writes } = fixture()
  state.addParameter()
  state.parameters.value[0].name = ''
  assert.equal(await state.save(), false)
  assert.equal(state.error.value, messages.invalidParameter)

  state.parameters.value[0].name = 'page'
  state.addParameter()
  state.parameters.value[1].name = 'page'
  assert.equal(await state.save(), false)
  assert.equal(state.error.value, messages.invalidParameter)

  state.parameters.value[1].name = 'test_user_id'
  state.changeProvider(1, 'user')
  state.parameters.value[1].value = 'password'
  assert.equal(await state.save(), false)
  assert.equal(state.error.value, messages.invalidParameter)
  assert.deepEqual(writes, [])

  state.parameters.value[1].value = 'username'
  assert.equal(await state.save(), true)
  assert.deepEqual(writes.at(-1).externalParameters, [
    { name: 'page', provider: 'fixed', configuration: { value: '' } },
    { name: 'test_user_id', provider: 'user', configuration: { field: 'username' } },
  ])
})

test('template page renders editable parameter rows', async () => {
  const form = await readFile(new URL('../views/application-center/Template/Save/ExternalParameterConfig.vue', import.meta.url), 'utf8')
  assert.match(form, /ApplicationTemplate\.parameters\.listTitle/)
  assert.match(form, /state\.addParameter/)
  assert.match(form, /state\.removeParameter/)
  assert.match(form, /state\.changeProvider/)
  assert.doesNotMatch(form, /loadProviders/)
})

test('only third-party templates display the redirect configuration', () => {
  const { state, detail } = fixture()
  for (const provider of [undefined, 'official', 'custom']) {
    detail.value = { ...detail.value, provider }
    assert.equal(state.supported.value, false)
  }
  detail.value = { ...detail.value, provider: 'third-party' }
  assert.equal(state.supported.value, true)
})

test('validates HTTP(S) addresses before saving, preserving query and fragment', async () => {
  const { state, writes } = fixture()
  for (const value of ['javascript:alert(1)', '/training', '//training.example', 'https:/training.example', 'https://']) {
    state.redirectUri.value = value
    assert.equal(await state.save(), false)
    assert.equal(state.error.value, messages.redirectUriInvalid)
  }
  state.redirectUri.value = '   '
  assert.equal(await state.save(), false)
  assert.equal(state.error.value, messages.redirectUriRequired)
  assert.deepEqual(writes, [])
  for (const value of ['http://training.example/ui/', 'HTTPS://training.example/ui/?page=dashboard#home']) {
    state.redirectUri.value = ` ${value} `
    assert.equal(await state.save(), true)
    assert.equal(writes.at(-1).redirectUri, value)
  }
})

test('reports save failure without discarding the address draft', async () => {
  const state = useApplicationTemplateParameters(() => ({ provider: 'third-party', configuration: { redirectUri: 'https://training.example/' } }), async () => { throw new Error('offline') }, messages)
  state.redirectUri.value = 'https://training.example/new'
  assert.equal(await state.save(), false)
  assert.equal(state.error.value, messages.saveFailed)
  assert.equal(state.saving.value, false)
  assert.equal(state.redirectUri.value, 'https://training.example/new')
})

test('template form keeps the built-in fixed/user sources without a provider metadata API', async () => {
  const form = await readFile(new URL('../views/application-center/Template/Save/ExternalParameterConfig.vue', import.meta.url), 'utf8')
  const api = await readFile(new URL('../api/application-center/applicationTemplate.ts', import.meta.url), 'utf8')
  assert.match(form, /sourceFixed/)
  assert.match(form, /sourceUser/)
  assert.doesNotMatch(api, /parameter-providers|getApplicationParameterProviders/)
})
