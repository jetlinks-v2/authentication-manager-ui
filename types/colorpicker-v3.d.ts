declare module 'colorpicker-v3' {
  import type { CSSProperties, DefineComponent } from 'vue'
  const ColorPicker: DefineComponent<{
    hex?: string
    rgba?: string
    showOpacity?: boolean
    btnStyle?: CSSProperties
    onChange?: (value: { hex: string; rgba: string }) => void
  }>
  export default ColorPicker
}
