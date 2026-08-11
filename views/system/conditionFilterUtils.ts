import type { ConditionFilterTerm } from '@jetlinks-web-core/components/ConditionFilter'

export interface ConditionQueryTerm extends Omit<ConditionFilterTerm, 'terms'> {
  terms?: ConditionQueryTerm[]
}

type ConditionLeafTransformer = (term: ConditionQueryTerm) => ConditionQueryTerm

/**
 * ConditionFilter 支持任意层级条件组，递归转换叶子条件时保留原有 AND/OR 分组关系。
 */
export const transformConditionTerms = (
  terms: ConditionFilterTerm[] = [],
  transformLeaf: ConditionLeafTransformer,
): ConditionQueryTerm[] => {
  return terms.map((term) => {
    if (Array.isArray(term.terms)) {
      return {
        ...term,
        terms: transformConditionTerms(term.terms, transformLeaf),
      }
    }

    return transformLeaf({ ...term })
  })
}
