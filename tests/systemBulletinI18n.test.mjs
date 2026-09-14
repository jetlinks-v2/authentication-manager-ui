import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { test } from 'node:test'
import ts from 'typescript'

const helperPath = resolve(import.meta.dirname, '../views/system/Announcement/announcementI18n.ts')

const loadHelper = async (locale = 'en') => {
  const source = await readFile(helperPath, 'utf8')
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText
  const exports = {}
  const dependency = (id) => {
    if (id === '@jetlinks-web-core/locales') {
      return {
        __esModule: true,
        default: {
          global: {
            locale: { value: locale },
            getLocaleMessage: (target) => ({
              'Announcement.status.published': target === 'zh' ? '已发布' : 'Published',
              'Announcement.status.unpublished': target === 'zh' ? '未发布' : 'Unpublished',
            }),
          },
        },
      }
    }
    return {}
  }
  new Function('require', 'exports', js)(dependency, exports)
  return exports
}

test('resolves the current locale and falls back to the legacy field without cross-language fallback', async () => {
  const { resolveAnnouncementText } = await loadHelper('en')
  const record = {
    title: '旧标题',
    summary: '旧摘要',
    content: '旧正文',
    i18nMessages: {
      title: { zh: '中文标题', en: 'English title' },
      summary: { zh: '中文摘要' },
      content: { zh: '中文正文', en: 'English content' },
    },
  }

  assert.equal(resolveAnnouncementText(record, 'title'), 'English title')
  assert.equal(resolveAnnouncementText(record, 'summary'), '旧摘要')
  assert.equal(resolveAnnouncementText(record, 'content'), 'English content')
})

test('supports regional locales and keeps legacy compatibility fields Chinese-first', async () => {
  const {
    resolveAnnouncementText,
    resolveCompatibilityText,
    normalizeAnnouncementI18n,
    buildAnnouncementI18nFields,
    updateAnnouncementLocaleText,
    mergeLegacyAnnouncementI18n,
  } = await loadHelper('zh-CN')
  const record = {
    title: '旧标题',
    i18nMessages: { title: { zh: '中文标题', en: 'English title' } },
  }

  assert.equal(resolveAnnouncementText(record, 'title'), '中文标题')
  assert.equal(resolveCompatibilityText({ zh: '', en: 'English title' }, '旧标题'), 'English title')
  assert.deepEqual(normalizeAnnouncementI18n({
    title: { zh: ' 中文标题 ', en: ' English title ', fr: ' Français ', empty: '' },
    summary: {},
    content: null,
    ignored: 'value',
  }), {
    title: { zh: '中文标题', en: 'English title' },
  })

  assert.deepEqual(updateAnnouncementLocaleText(
    { title: { zh: '中文标题' } },
    'title',
    'en-US',
    ' English title ',
  ), {
    title: { zh: '中文标题', en: 'English title' },
  })
  assert.deepEqual(updateAnnouncementLocaleText(
    { title: { zh: '中文标题', en: 'English title' } },
    'title',
    'en',
    '',
  ), {
    title: { zh: '中文标题' },
  })
  assert.deepEqual(mergeLegacyAnnouncementI18n(
    { title: { en: 'English title' } },
    { title: '旧标题', summary: '旧摘要', content: '旧正文' },
  ), {
    title: { zh: '旧标题', en: 'English title' },
    summary: { zh: '旧摘要' },
    content: { zh: '旧正文' },
  })

  assert.deepEqual(mergeLegacyAnnouncementI18n({}, {
    title: undefined,
    summary: undefined,
    content: undefined,
  }), {})

  assert.deepEqual(mergeLegacyAnnouncementI18n({
    title: { en: 'English title' },
    summary: { en: 'English summary' },
    content: { en: 'English content' },
  }, {
    title: 'English title',
    summary: 'English summary',
    content: 'English content',
  }), {
    title: { en: 'English title' },
    summary: { en: 'English summary' },
    content: { en: 'English content' },
  })

  assert.deepEqual(buildAnnouncementI18nFields({
    title: '旧标题',
    summary: '旧摘要',
    content: '旧正文',
    i18nMessages: {
      title: { zh: '中文标题', en: 'English title' },
      summary: { en: 'English summary' },
      content: {},
    },
  }), {
    i18nMessages: {
      title: { zh: '中文标题', en: 'English title' },
      summary: { en: 'English summary' },
    },
    title: '中文标题',
    summary: 'English summary',
    content: '旧正文',
  })

  const englishDefaultContent = '## Announcement\nEnter the information users need to know.'
  const afterEnglishCreate = updateAnnouncementLocaleText({}, 'content', 'en', englishDefaultContent)
  assert.deepEqual(afterEnglishCreate, { content: { en: englishDefaultContent } })
  assert.deepEqual(mergeLegacyAnnouncementI18n(afterEnglishCreate, {
    content: englishDefaultContent,
  }), {
    content: { en: englishDefaultContent },
  })

  const translatedDefaultContent = '## Announcement\nEnter the information users need to know.'
  const legacyChineseContent = '旧中文正文'
  const legacyContent = legacyChineseContent === translatedDefaultContent ? undefined : legacyChineseContent
  assert.deepEqual(mergeLegacyAnnouncementI18n(
    { content: { en: 'English content' } },
    { content: legacyContent },
  ), {
    content: { zh: '旧中文正文', en: 'English content' },
  })
  const defaultEnglishContent = translatedDefaultContent === translatedDefaultContent
    ? undefined
    : translatedDefaultContent
  assert.deepEqual(mergeLegacyAnnouncementI18n(
    { title: { en: 'English title' } },
    { content: defaultEnglishContent },
  ), {
    title: { en: 'English title' },
  })

  assert.deepEqual(buildAnnouncementI18nFields({
    i18nMessages: { title: { fr: 'Titre' }, summary: { de: 'Zusammenfassung' } },
  }), {
    i18nMessages: undefined,
    title: '',
    summary: '',
    content: '',
  })
})

test('keeps malformed announcement data on the legacy fallback path', async () => {
  const { resolveAnnouncementText, normalizeAnnouncementI18n } = await loadHelper('en')
  assert.equal(resolveAnnouncementText({ title: '旧标题', i18nMessages: 'broken' }, 'title'), '旧标题')
  assert.equal(resolveAnnouncementText({ title: '旧标题', i18nMessages: null }, 'title'), '旧标题')
  assert.deepEqual(normalizeAnnouncementI18n(null), {})
})

test('resolves the announcement state label by target language', async () => {
  const { resolveAnnouncementStateLabel } = await loadHelper('zh')
  assert.equal(resolveAnnouncementStateLabel('unpublished', 'zh'), '未发布')
  assert.equal(resolveAnnouncementStateLabel('unpublished', 'en'), 'Unpublished')
  assert.equal(resolveAnnouncementStateLabel('published', 'en-US'), 'Published')
  assert.equal(resolveAnnouncementStateLabel('unknown', 'en'), '')
  assert.equal(resolveAnnouncementStateLabel('', 'en'), '')
  assert.equal(resolveAnnouncementStateLabel(undefined, 'en'), '')
})
