import type { ObjectPresentation } from '@jetlinks-web-core/types/object-presentation'
import { getTreeData_api } from './api/system/department'

/** Account labels belong to identity management; directory consumers do not infer user fields. */
export default {
  organization: {
    typeId: 'org',
    fields: [],
    directorySubtitle: () => undefined,
    directory: {
      mode: 'tree',
      load: async () => {
        const response = await getTreeData_api({
          paging: false,
          terms: [],
          sorts: [
            { name: 'sortIndex', order: 'asc' },
            { name: 'id', order: 'asc' }
          ]
        })
        if (!response.success || !Array.isArray(response.result)) throw response
        return response.result
      }
    }
  },
  user: {
    typeId: 'user',
    fields: [],
    directorySubtitle: (object) =>
      typeof object.username === 'string' && object.username.trim() ? object.username : undefined
  }
} satisfies Record<string, ObjectPresentation>
