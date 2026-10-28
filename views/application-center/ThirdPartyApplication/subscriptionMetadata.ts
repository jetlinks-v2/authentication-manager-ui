import type {
  SubscriptionEvent, SubscriptionEventSchema,
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
const fieldType = (schema?: SubscriptionEventSchema): string => {
  if (schema?.type === 'array') {
    const itemType = fieldType(schema.items)
    return itemType ? `${itemType}[]` : 'array'
  }
  const type = schema?.type
  return Array.isArray(type) ? type.join(' | ') : type || ''
}
const elementSchema = (schema: SubscriptionEventSchema): SubscriptionEventSchema =>
  schema.type === 'array' && schema.items ? elementSchema(schema.items) : schema

// 展示公共 JSON Schema，不推测动态字段类型或维护设备字段翻译。
export const subscriptionMetadataFields = (event: SubscriptionEvent): SubscriptionMetadataField[] => {
  const fields = (schema: SubscriptionEventSchema, path: string[] = []): SubscriptionMetadataField[] =>
    Object.entries(elementSchema(schema).properties || {}).map(([name, property]) => {
      const key = [...path, name]
      const element = elementSchema(property)
      const children = fields(property, key)
      const enumValues = element.enum?.map(displayValue).join('、')
      return {
        key: JSON.stringify(key), name, type: fieldType(property),
        description: property.description || property.title || '',
        enumValues: enumValues || undefined, example: displayValue(property.examples?.[0]),
        ...(children.length ? { children } : {}),
      }
    })
  return fields(event.schema || {})
}

export const hasMissingFieldDescriptions = (fields: SubscriptionMetadataField[]): boolean => fields.some(field =>
  !field.description || !!field.children?.length && hasMissingFieldDescriptions(field.children))
