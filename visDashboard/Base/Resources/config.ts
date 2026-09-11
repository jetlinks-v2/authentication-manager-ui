import { createDefaults } from '../shared/config'
export const config = {
  name: '资源中心', type: 'projectHomeResources',
  componentProps: {
    gridItem: { x: 0, y: 0, w: 8, h: 20, minW: 3, minH: 6 },
    projectHomeResources: createDefaults('Resources'),
  },
}
