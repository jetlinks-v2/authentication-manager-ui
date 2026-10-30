/** 当前用户在资源仪表盘可查看的业务能力；安装和授权均需满足。 */
export interface ResourcePageAccess {
  saas: boolean
  iot: boolean
  video: boolean
  edge: boolean
  vision: boolean
  aiEvents?: boolean
  visualization: boolean
  product: boolean
  collection: boolean
  networkCards: boolean
  map: boolean
}

export type ResourcePagePanel = 'message' | 'map' | 'gateway' | 'vision' | 'online'
  | 'traffic' | 'pools' | 'points' | 'protocols'

export interface ResourcePageCell {
  id: string
  panels: ResourcePagePanel[]
  span: 2 | 3 | 4 | 6
  offline?: boolean
}
