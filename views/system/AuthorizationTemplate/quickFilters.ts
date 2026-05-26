import i18n from '@jetlinks-web-core/locales'
import type { QuickFilterSidebarSection } from '@jetlinks-web-core/components/QuickFilterSidebar'
import { stateOptions } from './util'

const t = i18n.global.t.bind(i18n.global)

const clearShortcut = (column: string) => ({
  removeColumns: [column],
})

const valueShortcut = (column: string, value: string) => ({
  removeColumns: [column],
  terms: [
    {
      column,
      termType: 'eq',
      value,
    },
  ],
})

const toQuickItems = (column: string, options: { label: string; value: string }[]) => {
  return options.map((item) => ({
    label: item.label,
    value: item.value,
    shortcut: valueShortcut(column, item.value),
  }))
}

export const quickFilterSections: QuickFilterSidebarSection[] = [
  {
    key: 'state',
    title: t('AuthorizationTemplate.field.state'),
    collapsible: false,
    allOption: {
      label: t('AuthorizationTemplate.quick.all'),
      value: 'all',
      shortcut: clearShortcut('state'),
    },
    items: toQuickItems('state', stateOptions),
  },
]
