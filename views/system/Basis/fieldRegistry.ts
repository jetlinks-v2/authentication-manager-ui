import type { RegistryAction } from '@jetlinks-web-core/types/module'

export const BASIS_FORM_PAGE_CODE = 'system/Basis'
export const BASIS_FORM_MODULE_CODE = 'form-fields'

export const BASIS_FORM_FIELD = {
  BASE_PATH: 'base-path',
  RECORD_NUMBER: 'showRecordNumber',
  BACKGROUND: 'background',
  ICO: 'ico',
} as const

export type BasisFormFieldKey = typeof BASIS_FORM_FIELD[keyof typeof BASIS_FORM_FIELD]

export const createHiddenBasisFormFields = (
  fields: BasisFormFieldKey[],
): RegistryAction[] => fields.map(field => ({
  targetPage: BASIS_FORM_PAGE_CODE,
  targetModule: BASIS_FORM_MODULE_CODE,
  component: null,
  target: field,
  mode: 'hide',
  code: `hide-basis-${field}`,
}))