<template>
    <j-page-container>
      <full-page :fixed="false">
        <EqualHeightColumns
          class="calendar-layout"
          left-width="18.75rem"
          right-width="1fr"
        >
          <template #left>
            <CalendarTags />
          </template>
          <template #right>
            <CalendarRight />
          </template>
        </EqualHeightColumns>
      </full-page>
    </j-page-container>
</template>

<script setup>
import CalendarTags from './Tags/index.vue';
import CalendarRight from './CalendarRight/index.vue';
import { provide } from 'vue';
import FullPage from "@jetlinks-web-core/layout/FullPage.vue";

const tags = ref();
const rapidOn = ref();

provide('tagsMap', tags);
provide('rapidOn', rapidOn);

</script>
<style lang="less" scoped>
.calendar-layout {
    height: 100%;
}
</style>
