import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { transformSync } from 'esbuild'
import { parse, compileTemplate } from 'vue/compiler-sfc'

const root = resolve(import.meta.dirname, '..')
const registrationName = 'registerAdministrationHelpPoints'
const expectedCount = 15
const locales = Object.fromEntries(['zh', 'en', 'ja'].map(locale => [locale,
  JSON.parse(readFileSync(resolve(root, 'locales/lang', locale + '.json'), 'utf8'))]))
let currentLocale = 'zh'
function translate(key) {
  const messages = locales[currentLocale]
  const value = messages[key] ?? key.split('.').reduce((value, part) => value?.[part], messages)
  assert.equal(typeof value, 'string', currentLocale + ': missing ' + key)
  assert.ok(value.trim(), currentLocale + ': empty ' + key)
  return value
}
function evaluate(filename, dependencies = {}) {
  const module = { exports: {} }
  const { code } = transformSync(readFileSync(filename, 'utf8'), { loader: 'ts', format: 'cjs' })
  new Function('require', 'module', 'exports', code)(identifier => {
    assert.ok(identifier in dependencies, 'Unexpected dependency: ' + identifier)
    return dependencies[identifier]
  }, module, module.exports)
  return module.exports
}
const registry = evaluate(resolve(root, '../../jetlinks-web-core/src/utils/documentHelpRegistry.ts'))
const registration = evaluate(resolve(root, 'documentHelpPoints.ts'), {
  '@jetlinks-web-core/locales': { global: { t: translate } },
  '@jetlinks-web-core/utils/documentHelpRegistry': registry,
})
const register = registration[registrationName]
register()
const identity = point => JSON.stringify([point.code, point.key])
function vueFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const filename = resolve(directory, entry.name)
    return entry.isDirectory() ? vueFiles(filename) : entry.name.endsWith('.vue') ? [filename] : []
  })
}
const pages = vueFiles(resolve(root, 'views')).map(filename => ({ filename, source: readFileSync(filename, 'utf8') }))

function staticHelpPoints(source) {
  return [...source.matchAll(/<DocumentHelp\b[^>]*>/g)].flatMap(match => {
    const code = match[0].match(/(?:^|\s)code="([^"]+)"/)?.[1]
    const key = match[0].match(/(?:^|\s)help-key="([^"]+)"/)?.[1]
    return code && key ? [{ code, key }] : []
  })
}
function bindingFiles(point) {
  const direct = pages.filter(page => staticHelpPoints(page.source).some(candidate => identity(candidate) === identity(point)))
  if (direct.length || point.code !== 'system/DataSource') return direct
  const renderer = pages.find(page => page.filename.endsWith('DescriptionItemList.vue'))
  assert.match(renderer.source, /<DocumentHelp[^>]*code="system\/DataSource"[^>]*:help-key="item.helpKey"/)
  return pages.filter(page => page.source.includes("helpKey: '" + point.key + "'") && page.source.includes('DescriptionItemList'))
}

test('module startup registers stable, unique help identities without opening business pages', () => {
  const before = registry.getDocumentHelpPoints()
  assert.equal(before.length, expectedCount)
  assert.equal(new Set(before.map(identity)).size, expectedCount)
  register()
  assert.deepEqual(registry.getDocumentHelpPoints(), before)
  assert.ok(before.every(point => !('content' in point) && !('enabled' in point)))
  const entry = readFileSync(resolve(root, 'index.ts'), 'utf8')
  const startup = entry.match(/const register = \(\) => \{([^}]*)\}/s)?.[1]
  assert.ok(startup?.includes(registrationName + '()'), 'Help registration is missing from module startup')
})

test('all help names, pages and locations follow the selected language', () => {
  for (const locale of ['zh', 'en', 'ja']) {
    currentLocale = locale
    const points = registry.getDocumentHelpPoints()
    assert.equal(points.length, expectedCount)
    assert.ok(points.every(point => point.name && point.page && point.location))
  }
  currentLocale = 'zh'
})

test('each registered point has a business component binding and a real menu code', () => {
  const menus = JSON.parse(readFileSync(resolve(root, 'baseMenu.json'), 'utf8'))
  const menuCodes = items => items.flatMap(item => [item.code, ...menuCodes(item.children || [])])
  const codes = new Set(menuCodes(menus))
  for (const point of registry.getDocumentHelpPoints()) {
    assert.ok(codes.has(point.code), 'Missing menu: ' + point.code)
    assert.ok(bindingFiles(point).length, 'Missing help binding: ' + identity(point))
  }
})

test('bound page templates compile and keep help buttons outside existing buttons', () => {
  const files = new Map(registry.getDocumentHelpPoints().flatMap(point => bindingFiles(point)).map(page => [page.filename, page]))
  for (const { filename, source } of files.values()) {
    const { descriptor, errors } = parse(source, { filename })
    assert.deepEqual(errors, [], filename)
    assert.ok(source.split('\n').length <= 301, 'Component exceeds 300 lines: ' + filename)
    const result = compileTemplate({ filename, id: 'document-help', source: descriptor.template.content,
      compilerOptions: { expressionPlugins: ['typescript'] } })
    assert.deepEqual(result.errors, [], filename)
    function visit(node, insideButton = false) {
      if (node.type === 1 && node.tag === 'DocumentHelp') assert.equal(insideButton, false, filename)
      const nested = insideButton || node.type === 1 && ['button', 'a-button', 'j-permission-button'].includes(node.tag)
      for (const child of node.children || []) visit(child, nested)
    }
    visit(descriptor.template.ast)
  }
})
