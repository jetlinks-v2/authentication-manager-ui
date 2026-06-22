import type { ThemeStyleKey } from '@jetlinks-web-core/utils'

// 基本配置表单数据类型接口
export interface formDataType {
    title: string | undefined,  // 系统名称
    headerTheme: ThemeStyleKey,  // 界面风格
    apiKey: string | undefined,  // 高德API Key
    webKey: string | undefined, // 高德web key

    secretKey: string | undefined, // 高德web key
    exchangeRate: string | undefined,
    'base-path': string | undefined,  // base-path
    showRecordNumber?: boolean,
    recordNumber?: string,
    logo: string | undefined,  // 系统logo
    ico: string | undefined,  // 浏览器页签
    background: string | undefined  // 登录背景图
}
