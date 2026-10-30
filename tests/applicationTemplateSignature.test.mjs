import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { build } from 'esbuild'
import { effectScope, nextTick, ref } from 'vue'
import { parse, compileScript, compileTemplate } from 'vue/compiler-sfc'

const hook = new URL('../views/application-center/Template/Save/useTemplateNotificationSignature.ts', import.meta.url)
const { outputFiles } = await build({
  entryPoints: [hook.pathname], bundle: true, write: false, format: 'esm',
  plugins: [{
    name: 'notification-signature-fixture',
    setup(plugin) {
      plugin.onResolve({ filter: /^vue$/ }, () => ({ path: import.meta.resolve('vue'), external: true }))
      plugin.onResolve({ filter: /^vue-i18n$|^@authentication-manager-ui\/api\/application-center\/applicationTemplate$/ }, args => ({ path: args.path, namespace: 'fixture' }))
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `
        export const useI18n = () => ({ t: key => key });
        export const getTemplateNotificationSignature = (...args) => globalThis.notificationSignatureFixture.get(...args);
        export const revealTemplateNotificationSignature = (...args) => globalThis.notificationSignatureFixture.reveal(...args);
        export const saveTemplateNotificationSignature = (...args) => globalThis.notificationSignatureFixture.save(...args);
      ` }))
    },
  }],
})
const { useTemplateNotificationSignature } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`)
const settle = async () => { await nextTick(); await new Promise(resolve => setImmediate(resolve)) }

async function fixture() {
  const writes = []
  globalThis.notificationSignatureFixture = {
    get: async () => ({ result: { configured: true, keyId: 'derived-current' } }),
    reveal: async () => ({ result: { keyId: 'derived-current', secret: 'current-secret' } }),
    save: async (id, credential) => { writes.push({ id, credential }); return { result: { configured: true, keyId: credential.keyId } } },
  }
  const id = ref('template-first')
  const scope = effectScope()
  const state = scope.run(() => useTemplateNotificationSignature(() => id.value))
  await settle()
  return { state, id, writes, scope }
}

test('prepares a fresh keyId before switching and saves the exact supplied Secret', async () => {
  const { state, writes, scope } = await fixture()
  state.edit()
  const id = state.draft.value.keyId
  assert.match(id, /^notification-custom-v1:[a-f0-9]{32}$/)
  assert.notEqual(id, state.status.value.keyId)
  state.draft.value.secret = 'custom-signing-secret-with-at-least-32-bytes'
  assert.equal(state.status.value.keyId, 'derived-current')
  assert.equal(await state.save(), true)
  assert.deepEqual(writes, [{ id: 'template-first', credential: { keyId: id, secret: 'custom-signing-secret-with-at-least-32-bytes' } }])
  assert.equal(state.status.value.keyId, id)
  assert.equal(state.draft.value, undefined)
  assert.equal(state.secret.value.secret, 'custom-signing-secret-with-at-least-32-bytes')
  state.close()
  assert.equal(state.visible.value, false)
  assert.equal(state.secret.value, undefined)
  scope.stop()
})

test('accepts the receivers preconfigured keyId and Secret without replacing either value', async () => {
  const { state, writes, scope } = await fixture()
  state.edit()
  state.draft.value = { keyId: 'partner-prod-key-2026', secret: 'partner-preconfigured-secret-at-least-32-characters' }
  assert.equal(await state.save(), true)
  assert.deepEqual(writes, [{ id: 'template-first', credential: { keyId: 'partner-prod-key-2026', secret: 'partner-preconfigured-secret-at-least-32-characters' } }])
  assert.equal(state.status.value.keyId, 'partner-prod-key-2026')
  scope.stop()
})

test('rejects invalid drafts and keeps valid drafts after a failed write', async () => {
  const { state, writes, scope } = await fixture()
  state.edit()
  for (const value of ['', 'short', ' '.repeat(32), '中'.repeat(32), 'A'.repeat(257)]) {
    state.draft.value.secret = value
    assert.equal(await state.save(), false)
  }
  assert.equal(writes.length, 0)
  state.draft.value.secret = 'A'.repeat(32)
  const validId = state.draft.value.keyId
  for (const id of ['', 'bad key', 'bad\r\nheader', 'A'.repeat(129), 'notification-v1:1:template:1']) {
    state.draft.value.keyId = id
    assert.equal(await state.save(), false)
    assert.equal(state.error.value, 'ApplicationTemplate.signature.invalidKeyId')
  }
  assert.equal(writes.length, 0)
  state.draft.value.keyId = validId
  globalThis.notificationSignatureFixture.save = async () => { throw new Error('offline') }
  assert.equal(await state.save(), false)
  assert.equal(state.draft.value.secret, 'A'.repeat(32))
  assert.equal(state.status.value.keyId, 'derived-current')
  assert.equal(state.error.value, 'ApplicationTemplate.signature.saveFailed')
  state.close()
  assert.equal(state.draft.value, undefined)
  scope.stop()
})

test('switching templates discards late save results and clears signing material', async () => {
  const { state, id, scope } = await fixture()
  state.edit()
  state.draft.value.secret = 'A'.repeat(32)
  let complete
  globalThis.notificationSignatureFixture.save = () => new Promise(resolve => { complete = resolve })
  const saved = state.save()
  id.value = 'template-second'
  await settle()
  assert.equal(state.draft.value, undefined)
  assert.equal(state.secret.value, undefined)
  complete({ result: { configured: true, keyId: 'late-old-id' } })
  assert.equal(await saved, false)
  assert.notEqual(state.status.value.keyId, 'late-old-id')
  assert.equal(state.visible.value, false)
  scope.stop()
})

test('cancel and scope disposal clear view and edit material without saving', async () => {
  const { state, writes, scope } = await fixture()
  state.edit()
  const firstId = state.draft.value.keyId
  state.close()
  state.edit()
  assert.notEqual(state.draft.value.keyId, firstId)
  state.close()
  await state.reveal()
  assert.equal(state.secret.value.secret, 'current-secret')
  scope.stop()
  assert.equal(state.secret.value, undefined)
  assert.equal(state.draft.value, undefined)
  assert.equal(writes.length, 0)
})

test('the existing template config component compiles with the signing editor', async () => {
  const filename = new URL('../views/application-center/Template/Save/ExternalParameterConfig.vue', import.meta.url).pathname
  const { descriptor, errors } = parse(await readFile(filename, 'utf8'), { filename })
  assert.deepEqual(errors, [])
  const script = compileScript(descriptor, { id: 'template-signature-edit' })
  const template = compileTemplate({ source: descriptor.template.content, filename, id: 'template-signature-edit', compilerOptions: { bindingMetadata: script.bindings } })
  assert.deepEqual(template.errors, [])
})
