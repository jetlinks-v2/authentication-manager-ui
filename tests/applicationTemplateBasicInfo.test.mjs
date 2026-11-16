import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { parse, compileScript } from 'vue/compiler-sfc'

const apiModule = '@authentication-manager-ui/api/application-center/applicationTemplate'
const { outputFiles } = await build({
  stdin: {
    contents: `
      export { useApplicationTemplateBasicInfo } from './views/application-center/Template/Save/useApplicationTemplateBasicInfo';
      export { useApplicationTemplateDetail } from './views/application-center/Template/Save/useApplicationTemplateDetail';
      export { useApplicationTemplateParameters } from './views/application-center/Template/Save/useApplicationTemplateParameters';
      export { useApplicationTemplateCreate } from './views/application-center/Template/useApplicationTemplateCreate';
      export { default as TemplateIconEditor } from './views/application-center/Template/components/ApplicationTemplateIconEditor.vue';
      export { palette } from 'colorpicker-v3';
      export { default as SharedDialog } from './views/application-center/Template/components/ApplicationTemplateCreateDialog.vue';
      export { default as Summary } from './views/application-center/Template/Save/TemplateSummary.vue';
      export { useI18nTextField } from '../../jetlinks-web-core/src/components/I18n/hooks/useI18nTextField';
      export { ref, effectScope, nextTick } from 'vue';
      export { api } from '${apiModule}';
      export { locale } from 'vue-i18n';
    `,
    resolveDir: fileURLToPath(new URL('..', import.meta.url)),
  },
  bundle: true,
  write: false,
  format: 'esm',
  plugins: [{
    name: 'basic-info-boundaries',
    setup(plugin) {
      plugin.onResolve({ filter: /^vue$/ }, () => ({ path: import.meta.resolve('vue'), external: true }))
      plugin.onLoad({ filter: /\.vue$/ }, async args => {
        const { descriptor } = parse(await readFile(args.path, 'utf8'), { filename: args.path })
        const script = compileScript(descriptor, { id: args.path, inlineTemplate: true })
        return { contents: script.content, loader: 'ts' }
      })
      plugin.onResolve({ filter: /^(@authentication-manager-ui\/api\/application-center\/applicationTemplate|@jetlinks-web\/utils|vue-i18n|colorpicker-v3(?:\/style\.css)?|@jetlinks-web-core\/components(?:\/IconValue|\/Upload\/utils)?)$/ }, args => ({ path: args.path, namespace: 'fixture' }))
      plugin.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path === apiModule ? `
        const copy = value => structuredClone(value);
        export const api = { records: {}, reads: [], writes: [], creates: [], get: null, put: null };
        export const createApplicationTemplate = async payload => {
          api.creates.push(JSON.parse(JSON.stringify(payload)));
          return { success: true, result: { id: 'created-template' } };
        };
        export const getApplicationTemplate = async id => {
          api.reads.push(id);
          return api.get ? api.get(id) : { success: true, result: copy(api.records[id]) };
        };
        export const updateApplicationTemplate = async (id, payload) => {
          api.writes.push({ id, payload: copy(payload) });
          const response = api.put ? await api.put(id, payload) : { success: true };
          if (response?.success !== false) api.records[id] = { ...api.records[id], ...copy(payload) };
          return response;
        };
      ` : args.path === 'vue-i18n' ? `
        import { ref } from 'vue';
        export const locale = ref('zh');
        export const useI18n = () => ({ t: key => key, locale });
      ` : args.path === 'colorpicker-v3/style.css' ? '' : args.path === 'colorpicker-v3' ? `
        import { h } from 'vue';
        export const palette = { choose: null, color: '' };
        export default { props: ['hex', 'rgba'], emits: ['change'], setup: (props, { emit }) => {
          palette.color = props.rgba; palette.choose = hex => emit('change', { hex });
          return () => h('span', { 'data-palette': props.hex });
        }};
      ` : args.path === '@jetlinks-web-core/components' ? `
        import { h } from 'vue';
        export const I18nTextField = { props: ['value', 'field', 'disabled'], setup: p => () => h('input', { value: p.value, 'data-field': p.field, disabled: p.disabled }) };
        export const FileUpload = { props: ['value', 'listType', 'disabled'], setup: p => () => h('span', { 'data-cover-upload': p.listType, 'aria-disabled': !!p.disabled }) };
      ` : args.path.endsWith('/Upload/utils') ? `
        export const uploadByRequest = () => {};
      ` : args.path.endsWith('/IconValue') ? `
        import { h } from 'vue';
        export const IconValueView = { props: ['value'], setup: p => () => h('span', { 'data-icon': p.value }) };
        export { parseIconValue, formatIconValueColor } from '../../jetlinks-web-core/src/components/IconValue/iconValue';
        export const IconValueEditor = { props: ['modelValue'], setup: (p, { slots }) => () => h('span', { 'data-icon-editor': p.modelValue }, slots.color?.()) };
      ` : `export const onlyMessage = () => {};`, resolveDir: fileURLToPath(new URL('..', import.meta.url)) }))
    },
  }],
})
const { useApplicationTemplateBasicInfo, useApplicationTemplateDetail, useApplicationTemplateParameters,
  useApplicationTemplateCreate, TemplateIconEditor, palette, SharedDialog, Summary, useI18nTextField, ref, effectScope, nextTick, api, locale } = await import(
  `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`,
)
const messages = {
  loadFailed: 'load failed', saveFailed: 'save failed', documentMaxLength: 'document too long', updated: name => name,
}
const savedTemplate = (id = 'template') => ({
  id, name: '原始名称', i18nName: '中文名称', code: 'unchanged-code', provider: 'third-party',
  description: '原始说明', i18nDescription: '中文说明', icon: 'color:#1890ff',
  templateUrl: 'https://legacy.example/template', state: 'enabled',
  document: 'saved document', i18nDocument: '中文文档',
  configuration: { redirectUri: 'https://app.example/', retained: { value: 'keep' } },
  i18nMessages: {
    name: { zh: '中文名称', en: 'English name' }, description: { zh: '中文说明', en: 'English description' },
    document: { zh: '中文文档', en: 'English document' }, extra: { en: 'Unrelated text' },
  },
})
const deferred = () => {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}
const settle = async () => { await new Promise(setImmediate); await nextTick() }

async function fixture(t, overrides = {}) {
  api.records = { template: { ...savedTemplate(), ...overrides }, another: savedTemplate('another') }
  api.reads = []; api.writes = []; api.creates = []; api.get = null; api.put = null
  locale.value = 'zh'
  const id = ref('template')
  const writable = ref(true)
  const scope = effectScope()
  const { detail, basic, parameters } = scope.run(() => {
    const detail = useApplicationTemplateDetail(() => id.value, messages)
    const basic = useApplicationTemplateBasicInfo({
      getTemplateId: () => id.value, getDetail: () => detail.detail.value,
      canUpdate: () => writable.value, busy: () => detail.loading.value || detail.saving.value,
      persist: detail.updateBasicInfo,
    })
    const parameters = useApplicationTemplateParameters(() => detail.detail.value, detail.updateConfiguration, {
      saveFailed: 'failed', redirectUriRequired: 'required', redirectUriInvalid: 'invalid',
      platformIdInvalid: 'invalid', invalidParameter: 'invalid', invalidNotification: 'invalid',
    })
    return { detail, basic, parameters }
  })
  t.after(() => scope.stop())
  await detail.load()
  await nextTick()
  return { detail, basic, parameters, id, writable, scope }
}

// 使用公共组件的真实双向绑定规则，验证主输入与多语言弹窗的保存载荷。
const inputFor = (basic, field) => useI18nTextField({
  field, label: field,
  get value() { return basic.draft[field] },
  get i18nMessages() { return basic.draft.i18nMessages },
}, (event, value) => {
  if (event === 'update:value') basic.draft[field] = value
  else basic.draft.i18nMessages = value
})

test('opening copies localized fields, cancelling discards only the dialog draft, and no-op saving sends no request', async t => {
  const { basic, detail } = await fixture(t)
  detail.documentDraft.value = 'unsaved document'
  basic.edit()
  assert.equal(basic.open.value, true)
  assert.equal(basic.draft.name, '中文名称')
  assert.equal(basic.draft.description, '中文说明')
  basic.draft.name = 'discard this'
  basic.draft.i18nMessages.name.en = 'discard this too'
  basic.cancel()
  assert.equal(basic.open.value, false)
  assert.equal(detail.detail.value.i18nMessages.name.en, 'English name')
  assert.equal(detail.documentDraft.value, 'unsaved document')
  basic.edit()
  assert.equal(await basic.save(), true)
  assert.equal(basic.open.value, false)
  assert.deepEqual(api.writes, [])
})

test('one basic save merges only changed fields and preserves live configuration, document drafts and unrelated translations', async t => {
  const { basic, detail, parameters } = await fixture(t)
  const configuration = detail.detail.value.configuration
  detail.documentDraft.value = 'unsaved document'
  detail.documentI18nDraft.value = { en: 'unsaved translation' }
  parameters.edit()
  parameters.redirectUri.value = 'https://app.example/unsaved'
  basic.edit()
  inputFor(basic, 'name').handleValueChange('  新名称  ')
  inputFor(basic, 'description').handleValueChange('新说明')
  detail.detail.value.i18nMessages.document.en = 'latest saved document translation'
  assert.equal(await basic.save(), true)
  assert.deepEqual(api.writes, [{ id: 'template', payload: {
    name: '新名称', description: '新说明',
    i18nMessages: {
      name: { zh: '新名称', en: 'English name' }, description: { zh: '新说明', en: 'English description' },
      document: { zh: '中文文档', en: 'latest saved document translation' }, extra: { en: 'Unrelated text' },
    },
  } }])
  await nextTick()
  assert.equal(detail.detail.value.i18nName, '新名称')
  assert.equal(detail.detail.value.i18nDescription, '新说明')
  assert.equal(detail.detail.value.templateUrl, 'https://legacy.example/template')
  assert.equal(detail.detail.value.code, 'unchanged-code')
  assert.equal(detail.detail.value.provider, 'third-party')
  assert.equal(detail.detail.value.icon, 'color:#1890ff')
  assert.equal(detail.detail.value.configuration, configuration)
  assert.equal(parameters.editing.value, true)
  assert.equal(parameters.redirectUri.value, 'https://app.example/unsaved')
  assert.equal(detail.documentDraft.value, 'unsaved document')
  assert.deepEqual(detail.documentI18nDraft.value, { en: 'unsaved translation' })
  assert.equal(detail.documentDirty.value, true)
  assert.deepEqual(api.reads, ['template'])
})

test('changing only an icon never writes localized names back into raw fields', async t => {
  const { basic, detail } = await fixture(t, { i18nName: 'English name', i18nDescription: 'English description' })
  locale.value = 'en-US'
  basic.icon.edit()
  basic.icon.draft.value = ''
  assert.equal(await basic.icon.save(), true)
  assert.deepEqual(api.writes[0].payload, { icon: '' })
  assert.equal(detail.detail.value.name, '原始名称')
  assert.equal(detail.detail.value.i18nName, 'English name')
})

test('the multilingual dialog updates translations without touching the other fields or languages', async t => {
  const { basic } = await fixture(t)
  basic.edit()
  inputFor(basic, 'name').saveI18nMessages({ zh: '中文名称', en: 'Updated English name' })
  assert.equal(await basic.save(), true)
  const payload = api.writes[0].payload
  assert.deepEqual(payload.i18nMessages.name, { zh: '中文名称', en: 'Updated English name' })
  assert.deepEqual(payload.i18nMessages.description, { zh: '中文说明', en: 'English description' })
  assert.equal('description' in payload, false)
  assert.equal('icon' in payload, false)
})

test('blank descriptions are rejected without removing existing translations or persisted text', async t => {
  const { basic, detail } = await fixture(t)
  basic.edit()
  inputFor(basic, 'description').handleValueChange('   ')
  assert.equal(await basic.save(), false)
  assert.equal(basic.error.value, 'ApplicationTemplate.message.descriptionRequired')
  assert.equal(basic.open.value, true)
  assert.equal(detail.detail.value.i18nDescription, '中文说明')
  assert.deepEqual(api.writes, [])
})

test('required names and all field limits apply before persistence, including hidden languages', async t => {
  const { basic } = await fixture(t)
  for (const [field, value, translation] of [
    ['name', '   '], ['name', 'n'.repeat(65)], ['description', 'd'.repeat(513)],
    ['name', 'valid', 'n'.repeat(65)], ['description', 'valid', 'd'.repeat(513)],
  ]) {
    basic.edit()
    basic.draft[field] = value
    if (translation) basic.draft.i18nMessages[field].en = translation
    assert.equal(await basic.save(), false)
    assert.equal(basic.open.value, true)
    assert.match(basic.error.value, /^ApplicationTemplate\.message\./)
    assert.equal(basic.submitting.value, false)
    basic.cancel()
  }
  basic.edit()
  inputFor(basic, 'name').handleValueChange('n'.repeat(64))
  inputFor(basic, 'description').handleValueChange('d'.repeat(512))
  assert.equal(await basic.save(), true)
  assert.equal(api.writes.length, 1)
})

test('the independent icon editor restores on cancel, validates limits and preserves other tab drafts', async t => {
  const { basic, detail, parameters } = await fixture(t)
  detail.documentDraft.value = 'document draft'
  parameters.edit()
  parameters.redirectUri.value = 'https://app.example/draft'
  basic.icon.edit()
  basic.edit()
  assert.equal(basic.open.value, false)
  basic.icon.draft.value = 'discard this'
  basic.icon.cancel()
  basic.icon.edit()
  assert.equal(basic.icon.draft.value, 'color:#1890ff')
  assert.equal(await basic.icon.save(), true)
  assert.deepEqual(api.writes, [])
  basic.icon.edit()
  basic.icon.draft.value = ' '.repeat(257)
  assert.equal(await basic.icon.save(), false)
  assert.equal(basic.icon.error.value, 'ApplicationTemplate.message.iconMaxLength')
  assert.equal(basic.icon.open.value, true)
  basic.icon.draft.value = 'i'.repeat(256)
  assert.equal(await basic.icon.save(), true)
  await nextTick()
  assert.deepEqual(api.writes[0].payload, { icon: 'i'.repeat(256) })
  assert.equal(detail.documentDraft.value, 'document draft')
  assert.equal(parameters.redirectUri.value, 'https://app.example/draft')
  assert.equal(parameters.editing.value, true)
})

test('failed icon saves retain the independent draft and share the submission lock', async t => {
  const { basic, detail } = await fixture(t)
  basic.edit()
  basic.icon.edit()
  assert.equal(basic.icon.open.value, false)
  basic.cancel()
  basic.icon.edit()
  basic.icon.draft.value = 'text:NEW'
  const response = deferred()
  api.put = () => response.promise
  const pending = basic.icon.save()
  await settle()
  assert.equal(await basic.icon.save(), false)
  basic.icon.cancel()
  assert.equal(basic.icon.open.value, true)
  response.resolve({ success: false })
  assert.equal(await pending, false)
  assert.equal(basic.icon.open.value, true)
  assert.equal(basic.icon.draft.value, 'text:NEW')
  assert.equal(detail.detail.value.icon, 'color:#1890ff')
  assert.equal(basic.icon.error.value, messages.saveFailed)
  basic.icon.cancel()
  assert.equal(basic.icon.draft.value, 'color:#1890ff')
})

test('failed responses and exceptions keep the dialog and changes available for retry', async t => {
  const { basic, detail } = await fixture(t)
  basic.edit()
  basic.draft.name = 'retry name'
  for (const response of [() => ({ success: false, message: 'server rejected' }), () => { throw new Error('offline') }]) {
    api.put = response
    assert.equal(await basic.save(), false)
    assert.equal(basic.open.value, true)
    assert.equal(basic.draft.name, 'retry name')
    assert.equal(detail.detail.value.name, '原始名称')
    assert.equal(detail.saving.value, false)
    assert.equal(basic.submitting.value, false)
  }
  api.put = null
  assert.equal(await basic.save(), true)
  assert.equal(basic.open.value, false)
  assert.deepEqual(api.reads, ['template'])
})

test('validation and persistence share a submission lock and cannot be cancelled or repeated', async t => {
  const { basic, detail } = await fixture(t)
  const validating = deferred()
  const saving = deferred()
  basic.edit()
  basic.draft.name = 'pending name'
  basic.formRef.value = { validate: () => validating.promise, clearValidate() {} }
  api.put = () => saving.promise
  const pending = basic.save()
  assert.equal(basic.busy.value, true)
  assert.equal(await basic.save(), false)
  basic.cancel()
  assert.equal(basic.open.value, true)
  assert.deepEqual(api.writes, [])
  validating.resolve()
  await settle()
  assert.equal(detail.saving.value, true)
  assert.equal(await basic.save(), false)
  basic.cancel()
  assert.equal(basic.draft.name, 'pending name')
  assert.equal(api.writes.length, 1)
  saving.resolve({ success: true })
  assert.equal(await pending, true)
  assert.equal(basic.open.value, false)
  assert.equal(basic.busy.value, false)
})

test('read-only, loading and stale-target states prevent edits and permission loss prevents saving', async t => {
  const { basic, detail, writable, id } = await fixture(t)
  writable.value = false
  basic.edit()
  assert.equal(basic.open.value, false)
  writable.value = true
  detail.loading.value = true
  basic.edit()
  assert.equal(basic.open.value, false)
  detail.loading.value = false
  basic.edit()
  writable.value = false
  basic.draft.name = 'not allowed'
  assert.equal(await basic.save(), false)
  writable.value = true
  id.value = 'another'
  basic.edit()
  assert.equal(basic.open.value, false)
  assert.deepEqual(api.writes, [])
})

test('an old save cannot update a newly selected template or close its edit dialog', async t => {
  const { basic, detail, id } = await fixture(t)
  const first = deferred()
  const second = deferred()
  api.put = target => target === 'template' ? first.promise : second.promise
  basic.edit()
  basic.draft.name = 'old request'
  const oldSave = basic.save()
  await settle()
  id.value = 'another'
  assert.equal(basic.open.value, false)
  await detail.load()
  basic.edit()
  basic.draft.name = 'new request'
  const newSave = basic.save()
  await settle()
  first.resolve({ success: true })
  assert.equal(await oldSave, false)
  assert.equal(basic.open.value, true)
  assert.equal(basic.submitting.value, true)
  assert.equal(detail.saving.value, true)
  assert.equal(detail.detail.value.id, 'another')
  assert.equal(basic.draft.name, 'new request')
  second.resolve({ success: true })
  assert.equal(await newSave, true)
  assert.equal(detail.detail.value.name, 'new request')
})

test('unmounting invalidates an outstanding save instead of updating disposed detail state', async t => {
  const { basic, detail, scope } = await fixture(t)
  const response = deferred()
  api.put = () => response.promise
  basic.edit()
  basic.draft.name = 'disposed request'
  const pending = basic.save()
  await settle()
  scope.stop()
  response.resolve({ success: true })
  assert.equal(await pending, false)
  assert.equal(detail.detail.value.name, '原始名称')
})

test('late loads are ignored and never overwrite the latest template or document draft', async t => {
  const { detail, id } = await fixture(t)
  const first = deferred()
  const second = deferred()
  api.get = target => target === 'template' ? first.promise : second.promise
  const oldLoad = detail.load()
  id.value = 'another'
  const newLoad = detail.load()
  second.resolve({ success: true, result: savedTemplate('another') })
  await newLoad
  detail.documentDraft.value = 'new template draft'
  first.resolve({ success: true, result: savedTemplate() })
  await oldLoad
  assert.equal(detail.detail.value.id, 'another')
  assert.equal(detail.documentDraft.value, 'new template draft')
  assert.equal(detail.loading.value, false)
})

async function renderComponent(component, props) {
  const app = createSSRApp(component, props)
  const passthrough = { props: ['label'], setup: (p, { slots }) => () => h('section', [p.label, slots.default?.()]) }
  for (const name of ['a-form', 'a-form-item', 'a-alert', 'a-radio-button', 'a-tag', 'a-popconfirm', 'PageActions']) app.component(name, passthrough)
  app.component('AIcon', { render: () => null })
  app.component('a-modal', { props: ['open', 'title'], setup: (p, { slots }) => () => p.open ? h('dialog', { title: p.title }, slots.default?.()) : null })
  app.component('a-radio-group', { props: ['value', 'disabled'], setup: (p, { slots }) => () => h('div', { role: 'radiogroup', 'aria-disabled': !!p.disabled, 'data-value': p.value }, slots.default?.()) })
  app.component('a-input', { props: ['value', 'disabled'], setup: p => () => h('input', { value: p.value, disabled: p.disabled }) })
  app.component('a-button', { props: ['disabled'], setup: (p, { slots }) => () => h('button', { disabled: p.disabled }, slots.default?.()) })
  return renderToString(app)
}

test('create and edit both show media and description while editing locks type and code and excludes redirect configuration', async t => {
  const { basic } = await fixture(t)
  const createHtml = await renderComponent(SharedDialog, { open: true })
  assert.match(createHtml, /ApplicationTemplate.list.add/)
  assert.match(createHtml, /role="radiogroup" aria-disabled="false"/)
  assert.match(createHtml, /ApplicationTemplate.field.icon|data-icon-editor/)
  assert.match(createHtml, /ApplicationTemplate.field.coverImage/)
  assert.match(createHtml, /data-cover-upload="picture-card"/)
  assert.match(createHtml, /data-field="description"/)
  basic.edit()
  const editHtml = await renderComponent(SharedDialog, { editState: basic })
  assert.match(editHtml, /ApplicationTemplate.detail.edit/)
  assert.match(editHtml, /role="radiogroup" aria-disabled="true" data-value="third-party"/)
  assert.match(editHtml, /value="unchanged-code" disabled/)
  assert.match(editHtml, /value="中文名称" data-field="name"/)
  assert.match(editHtml, /value="中文说明" data-field="description"/)
  assert.match(editHtml, /data-icon-editor="color:#1890ff"/)
  assert.match(editHtml, /data-cover-upload="picture-card"/)
  assert.doesNotMatch(editHtml, /ApplicationTemplate.parameters.redirectUri/)
})

test('the summary exposes its own icon edit button, the common edit action and status without inline fields or a template URL', async t => {
  const { detail } = await fixture(t)
  const props = { detail: detail.detail.value, state: 'enabled', canUpdate: true }
  const html = await renderComponent(Summary, props)
  assert.match(html, /template-summary__icon-button[^>]+title="ApplicationTemplate.field.editIcon"/)
  assert.match(html, /ApplicationTemplate.common.edit/)
  assert.match(html, /ApplicationTemplate.common.disable/)
  assert.match(html, /ApplicationTemplate.field.id/)
  assert.doesNotMatch(html, /<input|<dialog|https:\/\/legacy.example|ApplicationTemplate.field.templateUrl/)
  const readonly = await renderComponent(Summary, { ...props, canUpdate: false })
  assert.match(readonly, /template-summary__icon-button[^>]+disabled/)
  assert.doesNotMatch(readonly, /ApplicationTemplate.common.edit|ApplicationTemplate.common.disable/)
})

test('reusing the list dialog retains business and third-party creation payloads and resets create drafts on reopening', async t => {
  await fixture(t)
  for (const provider of ['official', 'third-party']) {
    const scope = effectScope()
    t.after(() => scope.stop())
    const open = ref(true)
    let created
    const state = scope.run(() => useApplicationTemplateCreate({
      open: () => open.value, onOpenChange: value => { open.value = value }, onCreated: id => { created = id },
    }))
    Object.assign(state.formData, { name: 'New template', description: 'Template description', code: 'new-code', provider })
    await nextTick()
    state.formData.redirectUri = ' https://new.example/app '
    state.formData.i18nMessages = { name: { en: 'New template' } }
    state.formData.icon = 'color:#1677ff'
    state.formData.coverImage = '/upload/template-cover.png'
    await state.handleOk()
    assert.equal(created, 'created-template')
    assert.equal(open.value, false)
    assert.deepEqual(api.creates.at(-1), {
      name: 'New template', description: 'Template description', code: 'new-code', provider, state: 'enabled', i18nMessages: { name: { en: 'New template' } },
      icon: 'color:#1677ff', coverImage: '/upload/template-cover.png',
      ...(provider === 'third-party' ? { configuration: { redirectUri: 'https://new.example/app' } } : { layoutVariant: 'application' }),
    })
    open.value = true
    await nextTick()
    assert.equal(state.formData.name, '')
    assert.equal(state.formData.description, '')
    assert.equal(state.formData.code, '')
    assert.equal(state.formData.icon, '')
    assert.equal(state.formData.coverImage, '')
    assert.equal(state.formData.provider, 'official')
    assert.equal(state.formData.redirectUri, '')
  }
})

test('unfinished media selection blocks creation and clearing the cover does not remove the icon', async t => {
  await fixture(t)
  const scope = effectScope()
  t.after(() => scope.stop())
  const open = ref(true)
  const state = scope.run(() => useApplicationTemplateCreate({
    open: () => open.value, onOpenChange: value => { open.value = value }, onCreated: () => {},
  }))
  Object.assign(state.formData, { name: 'Template', description: 'Template description', code: 'media-template', icon: 'font:AppstoreOutlined', coverImage: '/upload/cover.png' })
  for (const key of Object.keys(state.mediaInteraction)) {
    state.mediaInteraction[key] = true
    await state.handleOk()
    assert.equal(state.busy.value, true)
    assert.equal(api.creates.length, 0)
    assert.equal(open.value, true)
    state.mediaInteraction[key] = false
  }
  state.clearCoverImage()
  await state.handleOk()
  assert.equal(api.creates.length, 1)
  assert.equal(api.creates[0].icon, 'font:AppstoreOutlined')
  assert.equal('coverImage' in api.creates[0], false)
})

test('cancelling and reopening discards both media drafts and leaves optional fields out of the payload', async t => {
  await fixture(t)
  const scope = effectScope()
  t.after(() => scope.stop())
  const open = ref(true)
  const state = scope.run(() => useApplicationTemplateCreate({
    open: () => open.value, onOpenChange: value => { open.value = value }, onCreated: () => {},
  }))
  state.formData.icon = '/upload/icon.png'
  state.handleCoverUploadChange({ file: { uid: 'cover', name: 'cover.png', status: 'done', response: { result: { accessUrl: '/upload/cover.png' } } }, fileList: [] })
  open.value = false
  await nextTick()
  open.value = true
  await nextTick()
  assert.equal(state.formData.icon, '')
  assert.equal(state.formData.coverImage, '')
  assert.deepEqual(state.coverFiles.value, [])
  Object.assign(state.formData, { name: 'Template', description: 'Template description', code: 'without-media' })
  await state.handleOk()
  assert.equal('icon' in api.creates[0], false)
  assert.equal('coverImage' in api.creates[0], false)
})

test('cover uploading blocks submission and clearing until its access URL is ready, then persists the URL instead of the file ID', async t => {
  await fixture(t)
  const scope = effectScope()
  t.after(() => scope.stop())
  const open = ref(true)
  const state = scope.run(() => useApplicationTemplateCreate({
    open: () => open.value, onOpenChange: value => { open.value = value }, onCreated: () => {},
  }))
  Object.assign(state.formData, { name: 'Template', description: 'Template description', code: 'uploaded-cover', icon: 'color:#1677ff' })
  const file = { uid: 'cover', name: 'original.png', status: 'uploading' }
  state.handleCoverUploadChange({ file, fileList: [file] })
  assert.equal(state.busy.value, true)
  state.clearCoverImage()
  assert.equal(state.coverFiles.value.length, 1)
  await state.handleOk()
  assert.deepEqual(api.creates, [])
  assert.equal(open.value, true)
  const accessUrl = '/file/cover?accessKey=original'
  state.handleCoverUploadChange({ file: { ...file, status: 'done', response: { success: true, result: { id: 'cover-id', accessUrl } } }, fileList: [] })
  assert.equal(state.busy.value, false)
  assert.equal(state.formData.coverImage, accessUrl)
  assert.equal(state.coverFiles.value[0].url, accessUrl)
  assert.equal(state.coverFiles.value[0].name, 'original.png')
  await state.handleOk()
  assert.equal(api.creates[0].coverImage, accessUrl)
  assert.equal(api.creates[0].icon, 'color:#1677ff')
})

test('rejected cover files and failed uploads preserve the last successful image, and clearing removes both URL and preview', async t => {
  await fixture(t)
  const scope = effectScope()
  t.after(() => scope.stop())
  const state = scope.run(() => useApplicationTemplateCreate({
    open: () => true, onOpenChange: () => {}, onCreated: () => {},
  }))
  state.formData.icon = 'font:AppstoreOutlined'
  const file = { uid: 'cover', name: 'original.png', status: 'done', response: { result: { accessUrl: '/file/original' } } }
  state.handleCoverUploadChange({ file, fileList: [file] })
  for (const failed of [
    { status: undefined }, { status: 'error' },
    { status: 'done', response: { success: false, result: { accessUrl: '/file/rejected' } } },
    { status: 'done', response: { success: true, result: { id: 'missing-url' } } },
  ]) {
    const replacement = { uid: 'replacement', name: 'replacement.png', status: 'uploading' }
    state.handleCoverUploadChange({ file: replacement, fileList: [replacement] })
    state.handleCoverUploadChange({ file: { ...replacement, ...failed }, fileList: [] })
    assert.equal(state.busy.value, false)
    assert.equal(state.formData.coverImage, '/file/original')
    assert.equal(state.coverFiles.value[0].url, '/file/original')
    assert.equal(state.coverFiles.value[0].name, 'original.png')
  }
  state.clearCoverImage()
  assert.equal(state.formData.coverImage, '')
  assert.deepEqual(state.coverFiles.value, [])
  assert.equal(state.formData.icon, 'font:AppstoreOutlined')
  state.handleCoverUploadChange({ file: { uid: 'failed', name: 'failed.png', status: 'error' }, fileList: [] })
  assert.deepEqual(state.coverFiles.value, [])
})


test('the palette changes the icon immediately and retains an existing color label', async () => {
  const updates = []
  await renderComponent(TemplateIconEditor, { modelValue: 'color:#1890ff:APP', 'onUpdate:modelValue': value => updates.push(value) })
  assert.equal(palette.color, '#1890ff')
  assert.deepEqual(updates, [])
  palette.choose('#ff7875')
  assert.deepEqual(updates, ['color:#ff7875:APP'])
})

test('creation requires a nonblank description and validates hidden translations before persistence', async t => {
  await fixture(t)
  const scope = effectScope()
  t.after(() => scope.stop())
  const state = scope.run(() => useApplicationTemplateCreate({ open: () => true, onOpenChange: () => {}, onCreated: () => {} }))
  Object.assign(state.formData, { name: 'Required description', code: 'description-required' })
  for (const description of ['', '   ', 'd'.repeat(513)]) {
    state.formData.description = description
    await state.handleOk()
    assert.deepEqual(api.creates, [])
    assert.equal(state.loading.value, false)
  }
  state.formData.description = 'valid'
  state.formData.i18nMessages.description = { en: 'd'.repeat(513) }
  await state.handleOk()
  assert.deepEqual(api.creates, [])
  state.formData.i18nMessages.description.en = 'valid translation'
  await state.handleOk()
  assert.equal(api.creates[0].description, 'valid')
  assert.equal(api.creates[0].i18nMessages.description.en, 'valid translation')
})

test('editing restores media, protects uploads, persists icon and cover changes, and preserves unrelated drafts', async t => {
  const { basic, detail, parameters } = await fixture(t, { coverImage: '/file/saved-cover' })
  detail.documentDraft.value = 'unsaved document'
  parameters.edit()
  parameters.redirectUri.value = 'https://app.example/unsaved'
  basic.edit()
  assert.equal(basic.draft.icon, 'color:#1890ff')
  assert.equal(basic.coverFiles.value[0].url, '/file/saved-cover')
  basic.draft.icon = 'font:AppstoreOutlined'
  const uploading = { uid: 'edit-cover', name: 'new.png', status: 'uploading' }
  basic.handleCoverUploadChange({ file: uploading, fileList: [uploading] })
  assert.equal(await basic.save(), false)
  basic.cancel()
  assert.equal(basic.open.value, true)
  assert.equal(basic.busy.value, true)
  basic.handleCoverUploadChange({ file: { ...uploading, status: 'done', response: { result: { accessUrl: '/file/new-cover' } } }, fileList: [] })
  api.put = () => ({ success: false })
  assert.equal(await basic.save(), false)
  assert.equal(basic.draft.icon, 'font:AppstoreOutlined')
  assert.equal(basic.draft.coverImage, '/file/new-cover')
  api.put = null
  assert.equal(await basic.save(), true)
  assert.deepEqual(api.writes.at(-1).payload, { icon: 'font:AppstoreOutlined', coverImage: '/file/new-cover' })
  assert.equal(detail.detail.value.coverImage, '/file/new-cover')
  assert.equal(detail.documentDraft.value, 'unsaved document')
  assert.equal(parameters.redirectUri.value, 'https://app.example/unsaved')
  basic.edit()
  basic.clearCoverImage()
  basic.draft.icon = ''
  basic.cancel()
  basic.edit()
  assert.equal(basic.draft.icon, 'font:AppstoreOutlined')
  assert.equal(basic.coverFiles.value[0].url, '/file/new-cover')
  basic.clearCoverImage()
  assert.equal(await basic.save(), true)
  assert.deepEqual(api.writes.at(-1).payload, { coverImage: '' })
})

test('legacy templates with no description require it on basic save and enforce media limits', async t => {
  const { basic } = await fixture(t, { description: '', i18nDescription: '', i18nMessages: {} })
  basic.edit()
  assert.equal(await basic.save(), false)
  assert.equal(basic.error.value, 'ApplicationTemplate.message.descriptionRequired')
  basic.draft.description = 'Added description'
  for (const [field, length] of [['icon', 257], ['coverImage', 1025]]) {
    basic.draft[field] = 'x'.repeat(length)
    assert.equal(await basic.save(), false)
    assert.equal(basic.error.value, `ApplicationTemplate.message.${field}MaxLength`)
    basic.draft[field] = ''
  }
  assert.equal(await basic.save(), true)
  assert.equal(api.writes[0].payload.description, 'Added description')
})

test('form validation errors keep field feedback without reporting a failed server save', async t => {
  const { basic } = await fixture(t)
  basic.edit()
  basic.formRef.value = { validate: async () => { throw { errorFields: [{ name: ['description'], errors: ['required'] }] } }, clearValidate() {} }
  assert.equal(await basic.save(), false)
  assert.equal(basic.error.value, '')
  assert.equal(basic.open.value, true)
  assert.equal(basic.busy.value, false)
  assert.deepEqual(api.writes, [])
})
