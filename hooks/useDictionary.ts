import {queryDicItemNoPage} from "@authentication-manager-ui/api/system/dictionary";
import {useRequest} from "@jetlinks-web/hooks";

// 根据传入的code查询， 不分页
export const useDictionary = (dictId: string, immediate = true) => {

    const {reload, data: options} = useRequest(queryDicItemNoPage, {
        defaultParams: {
            paging: false,
            sorts: [{name: 'ordinal', order: 'desc'}],
            terms: [{
                column: 'dictId',
                termType: 'eq',
                value: dictId
            }]
        },
        immediate: immediate
    })
    return {
        options: options.value,
        reload
    }
}
