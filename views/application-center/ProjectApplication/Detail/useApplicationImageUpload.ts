import { ref, watch, type Ref } from 'vue'
import type { UploadChangeParam, UploadFile } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'

interface ImageUploadResponse {
  success?: boolean
  result?: { accessUrl?: string }
}

/** 原图上传只回填访问地址；取消编辑后忽略旧上传结果，失败时保留原图片。 */
export const useApplicationImageUpload = (image: Ref<string>, editing: () => boolean) => {
  const { t } = useI18n()
  const imageUploading = ref(false)
  let activeUid: string | undefined

  watch(editing, () => {
    activeUid = undefined
    imageUploading.value = false
  }, { flush: 'sync' })

  const handleImageUploadChange = ({ file }: UploadChangeParam<UploadFile<ImageUploadResponse>>) => {
    if (!editing()) return
    if (file.status === 'uploading') {
      activeUid = file.uid
      imageUploading.value = true
      return
    }
    if (file.uid !== activeUid) return
    activeUid = undefined
    imageUploading.value = false
    if (file.status !== 'done') return

    const response = file.response
    const accessUrl = response?.result?.accessUrl?.trim()
    if (response?.success !== false && accessUrl) {
      image.value = accessUrl
    } else {
      onlyMessage(t('Upload.index.805902-1'), 'error')
    }
  }

  return { imageUploading, handleImageUploadChange }
}
