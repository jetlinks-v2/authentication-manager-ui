import { useI18n } from 'vue-i18n'

export const useSpecTablePagination = () => {
  const { t } = useI18n()
  return {
    defaultPageSize: 12,
    size: 'default' as const,
    pageSizeOptions: ['12', '24', '48', '96'],
    showSizeChanger: true,
    showTotal: (count: number) => t('ApiGroupManagement.spec.paginationTotal', { count }),
  }
}
