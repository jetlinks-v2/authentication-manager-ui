import { createDefaults } from '../shared/config'
export const config = {
  name: '用量与配额', type: 'projectHomeQuotas',
  componentProps: {
    gridItem: { x: 0, y: 0, w: 4, h: 8, minW: 3, minH: 6 },
    projectHomeQuotas: createDefaults('Quotas'),
  },
}
