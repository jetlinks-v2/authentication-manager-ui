import { useRequest } from "@jetlinks-web/hooks"
import { queryUserListNoPaging } from "../api/system/user"

export const useUser = (params = {}, immediate = true) => {
    const userList = ref<any[]>([])

    const {reload} = useRequest(queryUserListNoPaging, {
        defaultParams: {
            paging: false,
            ...params
        },
        immediate: immediate,
        onSuccess(resp) {
            if (resp.success) {
                userList.value = resp.result.map((i: any) => {
                    return {
                        ...i,
                        value: i.id,
                        label: i.name,
                    }
                })
            }
        }
    })

    return {
        userList,
        reload
    }
}

