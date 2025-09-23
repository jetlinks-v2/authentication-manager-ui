import { useRequest } from "@jetlinks-web/hooks"
import { getRoleList } from "../api/system/user"

export const useRole = (params = {}, immediate = true) => {
    const roleList = ref<any[]>([])

    const {reload} = useRequest(getRoleList, {
        defaultParams: {
            paging: false,
            ...params
        },
        immediate: immediate,
        onSuccess(resp) {
            if (resp.success) {
                roleList.value = resp.result.map((i: any) => {
                    return {
                        ...i,
                        value: i.groupId,
                        label: i.groupName,
                        children: (i.roles || []).map((item: any) => {
                            return {
                                ...item,
                                value: item.id,
                                label: item.name
                            }
                        })
                    }
                })
            }
        }
    })

    return {
        roleList,
        reload
    }
}
