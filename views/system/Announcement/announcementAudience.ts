import type { AnnouncementRecord } from './api'

type Translate = (key: string, values?: Record<string, string | number>) => string

/** 管理端范围来自投递关系投影，空投影不代表全员，按关系中保留的实际范围展示。 */
export const formatAnnouncementAudience = (record: AnnouncementRecord, t: Translate): string => {
  if (record.deliveryState === 'unselected') return t('Announcement.delivery.unselected')
  const dimensions = record.dimension
  const allVisible = dimensions.some(dimension => (
    (dimension.type === 'user' && dimension.id === '*')
    || (dimension.type === record.sourceDimension?.type && dimension.id === record.sourceDimension.id)
  ))
  const scope = allVisible
    ? t('Announcement.scope.platform')
    : dimensions.length
      ? t('Announcement.scope.selected', {
          userCount: dimensions.filter(dimension => dimension.type === 'user').length,
          organizationCount: dimensions.filter(dimension => dimension.type === 'org').length,
        })
      : t('Announcement.scope.empty')
  return `${t(`Announcement.delivery.${record.deliveryState}`)} · ${scope}`
}
