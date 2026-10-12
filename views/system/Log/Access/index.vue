<template>
    <j-page-container>
        <full-page hasPadding>
            <div class="access-log-layout">
            <j-pro-table
                mode="TABLE" class="pro-table__no-padding access-log-table"
                :columns="columns" :request="queryAccess" :defaultParams="defaultParams" :params="params"
                :custom-row="customRow" :row-class-name="rowClassName" :scroll="{ x: 960 }"
            >
                <template #headerLeftRender>
                    <h2 class="log-table-title">{{ $t('Log.index.407378-0') }}</h2>
                </template>
                <template #headerRightRender>
                    <ConditionFilter
                        v-model="filterTerms"
                        class="authentication-system-list-page__filter" :columns="columns"
                        target="search-access" @change="handleSearch"
                    />
                </template>
                <template #source="record">
                    <AccessLogCell :record="record" kind="source" />
                </template>
                <template #request="record">
                    <AccessLogCell :record="record" kind="request" @view="handleRecordClick(record, $event)" @search="searchSameValue" />
                </template>
                <template #operation="record">
                    <AccessLogCell :record="record" kind="operation" />
                </template>
            </j-pro-table>
            </div>
            <AccessLogDetail v-model:open="open" :record="selected" @search="searchSameValue" />
        </full-page>
    </j-page-container>
</template>
<script lang="ts" setup name="AccessLog">
import { useI18n } from 'vue-i18n';
import { queryAccess } from '@authentication-manager-ui/api/log';
import { useAccessLog } from './useAccessLog';
import AccessLogCell from './components/AccessLogCell.vue';
import AccessLogDetail from './components/AccessLogDetail.vue';
const { t: $t } = useI18n();
const { columns, params, defaultParams, filterTerms, open, selected, handleRecordClick,
    customRow, rowClassName, handleSearch, searchSameValue } = useAccessLog();
</script>
<style scoped>
.access-log-layout { height: 100%; min-height: 0; display: flex; flex-direction: column; }
.access-log-table { flex: 1; min-height: 0; }
.log-table-title {
    margin: 0;
    color: var(--ink-1);
    font-size: var(--fs-18);
    font-weight: 600;
    line-height: 2rem;
    white-space: nowrap;
}
.access-log-table :deep(.access-log-row) { cursor: pointer; }
</style>
