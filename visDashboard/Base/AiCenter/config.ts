import { createDefaults } from "../shared/config"
export const config = {
  name: "AI中心", type: "projectHomeAiCenter",
  componentProps: {
    gridItem: { x: 0, y: 17, w: 4, h: 10, minW: 3, minH: 6 },
    projectHomeAiCenter: createDefaults("AiCenter"),
  },
}
