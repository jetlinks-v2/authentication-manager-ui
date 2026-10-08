import { getUserList_api } from '@authentication-manager-ui/api/system/user';
import { debounce } from 'lodash-es';

interface UserOption {
    label: string;
    value: string;
}

interface UserDetail {
    name?: string;
    username?: string;
}

export const useUserOptions = () => {
    const userOptions = ref<UserOption[]>([]);
    const userOptionsLoading = ref(false);
    let requestSequence = 0;

    const loadUserOptions = async (keyword = '') => {
        const currentSequence = ++requestSequence;
        const searchValue = keyword.trim();
        userOptionsLoading.value = true;

        try {
            const response = await getUserList_api({
                pageIndex: 0,
                pageSize: 20,
                sorts: [{ name: 'name', order: 'asc' }],
                terms: searchValue
                    ? [{
                        terms: [
                            { column: 'name', termType: 'like', value: `%${searchValue}%` },
                            { column: 'username', termType: 'like', value: `%${searchValue}%`, type: 'or' },
                        ],
                    }]
                    : [],
            });

            // 只接收最后一次请求，避免快速输入时旧响应覆盖新结果。
            if (currentSequence === requestSequence) {
                userOptions.value = (response.result?.data || [])
                    .filter((item: UserDetail) => item.username)
                    .map((item: UserDetail) => ({
                        label: item.name || item.username!,
                        value: item.username!,
                    }));
            }
        } catch {
            if (currentSequence === requestSequence) {
                userOptions.value = [];
            }
        } finally {
            if (currentSequence === requestSequence) {
                userOptionsLoading.value = false;
            }
        }
    };

    const searchUsers = debounce((keyword: string) => {
        void loadUserOptions(keyword);
    }, 300);

    onBeforeUnmount(searchUsers.cancel);
    void loadUserOptions();

    return {
        userOptions,
        userOptionsLoading,
        searchUsers,
    };
};
