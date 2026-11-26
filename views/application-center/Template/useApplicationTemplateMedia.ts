import { computed, reactive, ref, watch } from 'vue'
import type { UploadChangeParam, UploadFile } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { onlyMessage } from '@jetlinks-web/utils'

interface TemplateMediaDraft { icon: string; coverImage: string }
interface CoverUploadResponse { success?: boolean; result?: { id?: string; accessUrl?: string } }

/** 创建与编辑共用媒体草稿；文件服务返回访问地址，不能将文件 ID 当作图片地址提交。 */
export const useApplicationTemplateMedia = (draft: TemplateMediaDraft, blocked: () => boolean) => {
  const { t } = useI18n()
  const mediaInteraction = reactive({ iconCrop: false, iconBusy: false, iconLibrary: false, coverBusy: false })
  const mediaBusy = computed(() => Object.values(mediaInteraction).some(Boolean))
  const coverFiles = ref<UploadFile<CoverUploadResponse>[]>([])
  const coverUploadKey = ref(0)
  let uploadedCover: UploadFile<CoverUploadResponse> | undefined

  const syncCoverFiles = () => {
    coverFiles.value = draft.coverImage ? [{
      ...(uploadedCover?.url === draft.coverImage ? uploadedCover : {
        uid: 'template-cover', name: t('ApplicationTemplate.field.coverImage'), status: 'done' as const,
      }),
      url: draft.coverImage,
    }] : []
    // 重建控件清除其内部预览缓存，防止清除／换图后仍预览上一张图片。
    coverUploadKey.value++
  }
  watch(() => draft.coverImage, syncCoverFiles, { immediate: true })

  const handleCoverUploadChange = (info: UploadChangeParam<UploadFile<CoverUploadResponse>>) => {
    mediaInteraction.coverBusy = info.file.status === 'uploading'
    if (mediaInteraction.coverBusy) {
      coverFiles.value = info.fileList.slice(-1)
      return
    }
    if (info.file.status === 'removed') return
    if (info.file.status === 'done') {
      const response = info.file.response
      const accessUrl = response?.result?.accessUrl
      if (response?.success !== false && typeof accessUrl === 'string' && accessUrl.trim()) {
        uploadedCover = { ...info.file, url: accessUrl }
        draft.coverImage = accessUrl
      } else {
        onlyMessage(t('Upload.index.805902-1'), 'error')
      }
    }
    // 请求错误由公共组件提示；拒绝或失败时回到草稿中已确认的图片。
    syncCoverFiles()
  }
  const clearCoverImage = () => {
    if (blocked() || mediaBusy.value) return
    draft.coverImage = ''
    uploadedCover = undefined
    syncCoverFiles()
  }
  const resetMedia = () => {
    Object.assign(mediaInteraction, { iconCrop: false, iconBusy: false, iconLibrary: false, coverBusy: false })
    uploadedCover = undefined
    syncCoverFiles()
  }
  return { mediaInteraction, mediaBusy, coverFiles, coverUploadKey, handleCoverUploadChange, clearCoverImage, resetMedia }
}
