import { createDefaults } from "../shared/config"
export const config = {
  name: "规则引擎", type: "projectHomeRuleEngine",
  componentProps: {
    gridItem: { x: 4, y: 17, w: 4, h: 10, minW: 2, minH: 6 },
    projectHomeRuleEngine: createDefaults("RuleEngine"),
  },
}
