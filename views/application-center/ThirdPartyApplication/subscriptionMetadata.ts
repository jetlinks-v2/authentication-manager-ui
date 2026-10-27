import type {
  SubscriptionEvent, SubscriptionMetadataProperty, SubscriptionMetadataValueType,
} from '@authentication-manager-ui/api/application-center/applicationSubscription'

export interface SubscriptionMetadataField {
  key: string
  name: string
  type: string
  description: string
  enumValues?: string
  example?: string
  children?: SubscriptionMetadataField[]
}

const displayValue = (value: unknown): string | undefined => value === undefined ? undefined
  : typeof value === 'string' ? value : JSON.stringify(value)
const fieldType = (valueType?: SubscriptionMetadataValueType): string => {
  if (valueType?.type === 'array') {
    const elementType = fieldType(valueType.elementType)
    return elementType ? `${elementType}[]` : valueType.name || valueType.type
  }
  return valueType?.name || valueType?.type || ''
}
const elementType = (valueType?: SubscriptionMetadataValueType): SubscriptionMetadataValueType | undefined =>
  valueType?.type === 'array' ? elementType(valueType.elementType) : valueType

// 直接读取目录的原生 PropertyMetadata，不再维护 JSON Schema 或设备字段中文映射。
export const subscriptionMetadataFields = (event: SubscriptionEvent): SubscriptionMetadataField[] => {
  const fields = (properties: SubscriptionMetadataProperty[], path: string[] = []): SubscriptionMetadataField[] =>
    properties.map(property => {
      const key = [...path, property.id]
      const type = elementType(property.valueType)
      const children = fields(type?.properties || [], key)
      const enumValues = type?.elements?.map(element => element.text
        ? `${displayValue(element.value)}（${element.text}）` : displayValue(element.value)).join('、')
      return {
        key: JSON.stringify(key), name: property.id, type: fieldType(property.valueType),
        description: property.description || property.name || '',
        enumValues: enumValues || undefined, example: displayValue(property.expands?.example),
        ...(children.length ? { children } : {}),
      }
    })
  return fields(event.properties || [])
}

export const hasMissingFieldDescriptions = (fields: SubscriptionMetadataField[]): boolean => fields.some(field =>
  !field.description || !!field.children?.length && hasMissingFieldDescriptions(field.children))
