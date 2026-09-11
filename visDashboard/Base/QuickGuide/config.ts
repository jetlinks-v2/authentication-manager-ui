import { createDefaults } from '../shared/config'

export const config = {
  name: '快速上手',
  type: 'projectHomeQuickGuide',
  componentProps: {
    gridItem: { x: 0, y: 7, w: 8, h: 5, minW: 4, minH: 3 },
    projectHomeQuickGuide: createDefaults('QuickGuide'),
  },
}
