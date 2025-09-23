import { useRequest } from "@jetlinks-web/hooks"
import { getTreeData_api } from "../api/system/department"

export const useDepartment = (params = {}, immediate = true) => {
    const departmentList = ref<any[]>([])

    const handleValue = (arr = []) => {
        return arr.map((i: any) => {
            return {
                ...i,
                value: i.id,
                label: i.name,
                children: handleValue(i.children || [])
            }
        })
    }

    const {reload} = useRequest(getTreeData_api, {
        defaultParams: {
            paging: false,
            ...params
        },
        immediate: immediate,
        onSuccess(resp) {
            if (resp.success) {
                departmentList.value = handleValue(resp.result)
            }
        }
    })

    return {
        departmentList,
        reload
    }
}
