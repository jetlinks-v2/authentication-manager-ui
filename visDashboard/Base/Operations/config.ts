import { createDefaults } from '../shared/config'
export const config = {
  name: '运维与监控', type: 'projectHomeOperations',
  componentProps: {
    gridItem: { x: 0, y: 0, w: 4, h: 13, minW: 3, minH: 6 },
    projectHomeOperations: createDefaults('Operations'),
  },
}
