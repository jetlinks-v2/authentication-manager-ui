import type { ConditionFilterClause, ConditionFilterExpressionNode, ConditionFilterTerm } from '@jetlinks-web-core/components/ConditionFilter';

// 编辑态可能包含未完成字段，组合表达式只接收有字段和操作符的条件节点。
const isExpressionNode = (term: ConditionFilterTerm): term is ConditionFilterExpressionNode =>
    (!term.type || term.type === 'and' || term.type === 'or') && (!!term.terms || !!(term.column && term.termType));

/** 快捷筛选只追加 AND 条件；OR 表达式整体保留，避免新条件被 OR 放宽。 */
export const appendLogFilter = (terms: ConditionFilterTerm[], clause: ConditionFilterClause): ConditionFilterTerm[] => {
    if (terms.some((term, index) => index > 0 && term.type === 'or')) {
        return [{ terms: terms.filter(isExpressionNode) }, { ...clause, type: 'and' }];
    }
    if (terms.some(term => !term.terms && term.column === clause.column
        && term.termType === clause.termType && term.value === clause.value)) return terms;
    return [...terms, { ...clause, type: terms.length ? 'and' : undefined }];
};
