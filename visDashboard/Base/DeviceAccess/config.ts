import { createDefaults } from "../shared/config"
export const config = {
  name: "设备与接入", type: "projectHomeDeviceAccess",
  componentProps: {
    gridItem: { x: 0, y: 7, w: 3, h: 10, minW: 3, minH: 6 },
    projectHomeDeviceAccess: createDefaults("DeviceAccess"),
  },
}
