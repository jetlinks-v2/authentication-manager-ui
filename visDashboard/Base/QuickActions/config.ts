import { createDefaults } from '../shared/config'
export const config = {
  name: '快捷操作', type: 'projectHomeQuickActions',
  componentProps: {
    gridItem: { x: 0, y: 0, w: 5, h: 8, minW: 3, minH: 6 },
    projectHomeQuickActions: createDefaults('QuickActions'),
  },
}
