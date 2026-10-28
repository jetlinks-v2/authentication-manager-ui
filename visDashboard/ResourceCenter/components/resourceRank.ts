/** 两类资源排行共用的展示字段；业务身份由各自的行类型保留。 */
export interface ResourceRankRow {
  id: string
  rank: number
  label: string
  caption: string
  tooltip: string
  width: number
  text: string
  color?: string
  detailAvailable: boolean
}
