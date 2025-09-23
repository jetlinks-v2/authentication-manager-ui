import { useRequest } from "@jetlinks-web/hooks"
import { queryPositionDetailNoPage } from "../api/system/positions"

export const usePositions = (params = {}, immediate = true) => {
    const positionsList = ref<any[]>([])

    const {reload} = useRequest(queryPositionDetailNoPage, {
        defaultParams: {
            paging: false,
            ...params
        },
        immediate: immediate,
        onSuccess(resp) {
            if (resp.success) {
                positionsList.value = resp.result.map((i: any) => {
                    return {
                        ...i,
                        value: i.id,
                        label: i.name
                    }
                })
            }
        }
    })

    return {
        positionsList,
        reload
    }
}
