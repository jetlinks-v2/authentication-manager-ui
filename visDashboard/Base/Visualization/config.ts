import { createDefaults } from "../shared/config"
export const config = {
  name: "大屏可视化", type: "projectHomeVisualization",
  componentProps: {
    gridItem: { x: 3, y: 7, w: 5, h: 10, minW: 4, minH: 6 },
    projectHomeVisualization: createDefaults("Visualization"),
  },
}
