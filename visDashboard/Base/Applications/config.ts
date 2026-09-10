import { createDefaults } from '../shared/config'
export const config = {
  name: '应用中心', type: 'projectHomeApplications',
  componentProps: {
    gridItem: { x: 0, y: 0, w: 3, h: 8, minW: 3, minH: 6 },
    projectHomeApplications: createDefaults('Applications'),
  },
}
