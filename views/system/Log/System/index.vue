<template>
    <j-page-container>
        <full-page hasPadding>
            <div class="system-log-layout">
                <j-pro-table
                    mode="TABLE" class="pro-table__no-padding system-log-table"
                    :columns="columns" :request="querySystem" :defaultParams="defaultParams" :params="params"
                    :custom-row="customRow" :row-class-name="rowClassName" :scroll="{ x: 880 }"
                >
                    <template #headerLeftRender>
                        <h2 class="log-table-title">{{ $t('Log.index.407378-1') }}</h2>
                    </template>
                    <template #headerRightRender>
                        <ConditionFilter
                            class="authentication-system-list-page__filter" :columns="columns"
                            target="search-system" @change="handleSearch"
                        />
                    </template>
                    <template #time="record"><SystemLogCell :record="record" kind="time" /></template>
                    <template #log="record"><SystemLogCell :record="record" kind="log" @view="handleRecordClick(record, $event)" /></template>
                    <template #source="record"><SystemLogCell :record="record" kind="source" /></template>
                </j-pro-table>
            </div>
            <SystemLogDetail v-model:open="open" :record="selected" />
        </full-page>
    </j-page-container>
</template>
<script lang="ts" setup name="SystemLog">
import { useI18n } from 'vue-i18n';
import { querySystem } from '@authentication-manager-ui/api/log';
import { useSystemLog } from './useSystemLog';
import SystemLogCell from './components/SystemLogCell.vue';
import SystemLogDetail from './components/SystemLogDetail.vue';
const { t: $t } = useI18n();
const { columns, params, defaultParams, open, selected, handleRecordClick,
    customRow, rowClassName, handleSearch } = useSystemLog();
</script>
<style scoped>
.system-log-layout { height: 100%; min-height: 0; display: flex; flex-direction: column; }
.system-log-table { flex: 1; min-height: 0; }
.log-table-title { margin: 0; color: var(--ink-1); font-size: var(--fs-18); font-weight: 600; line-height: 2rem; white-space: nowrap; }
.system-log-table :deep(.system-log-row) { cursor: pointer; }
</style>
