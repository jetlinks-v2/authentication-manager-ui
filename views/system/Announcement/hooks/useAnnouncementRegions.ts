import { ref } from 'vue'
import {
  queryAnnouncementRegions,
  type AnnouncementRegionOption,
} from '../api'

/** 编辑公告时按需加载区域，重复打开弹窗复用同一份区域选项。 */
export function useAnnouncementRegions() {
  const options = ref<AnnouncementRegionOption[]>([])
  const loading = ref(false)
  let loaded = false

  const load = async () => {
    if (loaded || loading.value) return
    loading.value = true
    try {
      options.value = await queryAnnouncementRegions()
      loaded = true
    } finally {
      loading.value = false
    }
  }

  return { options, loading, load }
}
