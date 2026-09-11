import { createDefaults } from "../shared/config"
export const config = {
  name: "采集器与物联网卡", type: "projectHomeCollection",
  componentProps: {
    gridItem: { x: 0, y: 17, w: 3, h: 10, minW: 2, minH: 6 },
    projectHomeCollection: createDefaults("Collection"),
  },
}
