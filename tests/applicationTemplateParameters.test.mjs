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

test('only saves the redirect address and preserves all other Configuration values verbatim', async () => {
  const externalParameters = [{ name: 'ticket', provider: 'custom', configuration: { nested: { value: 1 } } }]
  const { state, writes } = fixture({ externalParameters, parameters: { user: 'unchanged' } })
  state.redirectUri.value = ' https://training.example/new?page=dashboard#home '
  assert.equal(await state.save(), true)
  await nextTick()
  assert.deepEqual(writes[0], {
    retained: 'value', redirectUri: 'https://training.example/new?page=dashboard#home',
    externalParameters, parameters: { user: 'unchanged' },
  })
  assert.equal(state.redirectUri.value, 'https://training.example/new?page=dashboard#home')
  assert.equal('draft' in state, false)
  assert.equal('loadProviders' in state, false)
})

test('reset discards only the address draft', () => {
  const { state } = fixture()
  state.redirectUri.value = 'https://other.example/'
  state.reset()
  assert.equal(state.redirectUri.value, 'https://training.example/ui/')
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

test('template form and API no longer expose free parameter or parameter-provider controls', async () => {
  const form = await readFile(new URL('../views/application-center/Template/Save/ExternalParameterConfig.vue', import.meta.url), 'utf8')
  const api = await readFile(new URL('../api/application-center/applicationTemplate.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(form, /state\.(draft|add|remove|loadProviders|changeProvider)/)
  assert.doesNotMatch(api, /parameter-providers|getApplicationParameterProviders/)
})
