import { createDefaults } from '../shared/config'
export const config = {
  name: '系统公告', type: 'projectHomeAnnouncements',
  componentProps: {
    gridItem: { x: 0, y: 0, w: 4, h: 8, minW: 3, minH: 6 },
    projectHomeAnnouncements: createDefaults('Announcements'),
  },
}
