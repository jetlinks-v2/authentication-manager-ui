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

/**
 * 移除条件树中的叶子条件，空条件组会一并删除，保留其余分组的 AND/OR 关系。
 */
export const filterConditionTerms = (
  terms: ConditionFilterTerm[] = [],
  keepLeaf: (term: ConditionQueryTerm) => boolean,
): ConditionQueryTerm[] => {
  return terms.flatMap((term) => {
    if (Array.isArray(term.terms)) {
      const children = filterConditionTerms(term.terms, keepLeaf)
      return children.length ? [{...term, terms: children}] : []
    }

    return keepLeaf(term) ? [{...term}] : []
  })
}
