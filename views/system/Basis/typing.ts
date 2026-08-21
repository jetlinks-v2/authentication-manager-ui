import type { ThemeStyleKey } from '@jetlinks-web-core/utils'
import type { LayoutMode } from '@jetlinks-web-core/store/system'
import type { BasicLayoutVariant } from '@jetlinks-web-core/layout/runtime/layoutVariant'

// 基本配置表单数据类型接口
export interface formDataType {
    title: string | undefined,  // 系统名称
    headerTheme: ThemeStyleKey,  // 界面风格
    layout: LayoutMode,  // 导航模式
    layoutVariant: BasicLayoutVariant, // 布局壳层，由导航模式派生
    apiKey: string | undefined,  // 高德API Key
    webKey: string | undefined, // 高德web key

    secretKey: string | undefined, // 高德web key
    'base-path': string | undefined,  // base-path
    logo: string | undefined,  // 系统logo
    ico: string | undefined,  // 浏览器页签
    background: string | undefined,  // 登录背景图
    showRecordNumber?: boolean, // 是否展示备案号
    recordNumber?: string // 备案号
}
