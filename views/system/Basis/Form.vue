<template>
  <div v-if="loading" class="basis-form__loading">
    <a-spin />
  </div>
  <div v-else-if="error" class="basis-form__error">
    <a-result
      status="error"
      :title="$t('Basis.Config.loadFailed')"
      :sub-title="error"
    >
      <template #extra>
        <a-button @click="loadDetails">{{ $t('Basis.Config.retry') }}</a-button>
      </template>
    </a-result>
  </div>
  <a-form
    v-else
    ref="formRef"
    :model="formData"
    :rules="formRules"
    :scrollToFirstError="true"
    layout="vertical"
  >
    <BasisSection :title="$t('Basis.Config.basicInfo')">
      <template v-if="sectionEditMode" #extra>
        <BasisSectionActions
          section="basic"
          :active-section="editingSection"
          :can-edit="canEdit"
          :saving="saving"
          @edit="startEdit"
          @cancel="cancelEdit"
          @save="submit"
        />
      </template>
      <RegistryComponent
        :page-code="BASIS_FORM_PAGE_CODE"
        :code="BASIS_FORM_MODULE_CODE"
      >
        <BasisField
          :key="'title'"
          :label="$t('Basis.Form.436809-0')"
          name="title"
          :editing="isEditing('basic')"
          :display="displayValue(formData.title)"
        >
          <a-input
            v-model:value="formData.title"
            :placeholder="$t('Basis.Form.436809-1')"
          />
        </BasisField>
<!--        <BasisField-->
<!--          :key="'headerTheme'"-->
<!--          :label="$t('Basis.Form.436809-2')"-->
<!--          name="headerTheme"-->
<!--          :editing="isEditing('basic')"-->
<!--          :display="displayTheme"-->
<!--        >-->
<!--          <a-select-->
<!--            v-model:value="formData.headerTheme"-->
<!--            :options="headerThemeAreas"-->
<!--            @change="changeHeaderTheme"-->
<!--          />-->
<!--        </BasisField>-->
        <BasisField
          :key="'layout'"
          :label="$t('Basis.Form.436809-27')"
          name="layout"
          :align="isEditing('basic') ? 'start' : 'center'"
          :editing="isEditing('basic')"
          :display="displayLayout"
        >
          <LayoutModeSelector v-model:value="formData.layout" />
        </BasisField>
        <BasisField
          :key="'logo'"
          :label="$t('Basis.Form.436809-15')"
          :align="isEditing('basic') ? 'start' : 'center'"
          :editing="isEditing('basic')"
        >
          <Upload v-model:img-src="formData.logo" upload-type="logo" />
          <template #view>
            <BasisImagePreview
              :src="logoSrc"
              :alt="$t('Basis.Form.436809-15')"
              :placeholder="placeholder"
            />
          </template>
        </BasisField>
        <BasisField
          :key="BASIS_FORM_FIELD.ICO"
          :label="$t('Basis.Form.436809-16')"
          :align="isEditing('basic') ? 'start' : 'center'"
          :editing="isEditing('basic')"
        >
          <Upload v-model:img-src="formData.ico" upload-type="ico" />
          <template #view>
            <BasisImagePreview
              :src="icoSrc"
              :alt="$t('Basis.Form.436809-16')"
              :placeholder="placeholder"
            />
          </template>
        </BasisField>
        <div :key="BASIS_FORM_FIELD.RECORD_NUMBER" class="basis-field-group">
          <BasisField
            :label="$t('Basis.Form.436809-24')"
            name="showRecordNumber"
            :required="isEditing('basic')"
            :editing="isEditing('basic')"
            :display="displayValue(formData.showRecordNumber)"
          >
            <a-switch v-model:checked="formData.showRecordNumber" />
          </BasisField>
          <BasisField
            v-if="formData.showRecordNumber"
            :label="$t('Basis.Form.436809-25')"
            name="recordNumber"
            :rules="isEditing('basic') && formData.showRecordNumber ? recordNumberRules : undefined"
            :editing="isEditing('basic')"
            :display="displayValue(formData.recordNumber)"
          >
            <a-input
              v-model:value="formData.recordNumber"
              :placeholder="$t('Basis.Form.436809-26')"
            />
          </BasisField>
        </div>
      </RegistryComponent>
    </BasisSection>

    <BasisSection :title="$t('Basis.Config.mapConfig')">
      <template v-if="sectionEditMode" #extra>
        <BasisSectionActions
          section="map"
          :active-section="editingSection"
          :can-edit="canEdit"
          :saving="saving"
          @edit="startEdit"
          @cancel="cancelEdit"
          @save="submit"
        />
      </template>
      <RegistryComponent
        :page-code="BASIS_FORM_PAGE_CODE"
        :code="BASIS_FORM_MODULE_CODE"
      >
        <MapSettings
          :key="'map-keys'"
          v-model:web-key="formData.webKey"
          v-model:api-key="formData.apiKey"
          v-model:secret-key="formData.secretKey"
          :editing="isEditing('map')"
          :placeholder="placeholder"
          :secret-display="maskedSecret"
        />
        <BasisField
          :key="BASIS_FORM_FIELD.BASE_PATH"
          label="base-path"
          name="base-path"
          :rules="isEditing('map') ? basePathRules : undefined"
          :editing="isEditing('map')"
          :display="displayValue(formData['base-path'])"
        >
          <template #tooltip>
            <div>
              <div>{{ $t('Basis.Form.436809-12') }}</div>
              <div>
                {{ $t('Basis.Form.436809-13') }}{http/https}:
                //{前端所在服务器IP地址}:{前端暴露的服务端口}/api
              </div>
            </div>
          </template>
          <a-input
            v-model:value="formData['base-path']"
            :placeholder="$t('Basis.Form.436809-14')"
          />
        </BasisField>
      </RegistryComponent>
    </BasisSection>

    <RegistryComponent
      :page-code="BASIS_FORM_PAGE_CODE"
      :code="BASIS_FORM_MODULE_CODE"
    >
      <BasisSection :key="BASIS_FORM_FIELD.BACKGROUND" :title="$t('Basis.Form.436809-18')">
        <template v-if="sectionEditMode" #extra>
          <BasisSectionActions
            section="background"
            :active-section="editingSection"
            :can-edit="canEdit"
            :saving="saving"
            @edit="startEdit"
            @cancel="cancelEdit"
            @save="submit"
          />
        </template>
        <BasisField
          :label="$t('Basis.Form.436809-18')"
          name="background"
          :align="isEditing('background') ? 'start' : 'center'"
          :editing="isEditing('background')"
        >
          <Upload
            v-model:img-src="formData.background"
            class="basis-upload--background"
            height="16rem"
            upload-type="background"
            width="100%"
          />
          <template #view>
            <BasisImagePreview
              :src="backgroundSrc"
              :alt="$t('Basis.Form.436809-18')"
              :placeholder="placeholder"
              size="lg"
            />
          </template>
        </BasisField>
      </BasisSection>
    </RegistryComponent>

    <div v-if="showBtn" class="basis-form__actions">
      <j-permission-button
        has-permission="system/Basis:update"
        html-type="submit"
        type="primary"
        :loading="saving"
        @click="submit"
      >
        {{ $t('Basis.Form.436809-17') }}
      </j-permission-button>
    </div>
  </a-form>
</template>

<script lang="ts" name="BasicForm" setup>
import Upload from '@jetlinks-web-core/views/init-home/Basic/components/upload/upload.vue'
import LayoutModeSelector from './components/LayoutModeSelector.vue'
import MapSettings from './components/MapSettings.vue'
import BasisSection from './components/BasisSection.vue'
import BasisSectionActions from './components/BasisSectionActions.vue'
import BasisField from './components/BasisField.vue'
import BasisImagePreview from './components/BasisImagePreview.vue'
import { BASIS_FORM_FIELD, BASIS_FORM_MODULE_CODE, BASIS_FORM_PAGE_CODE } from './fieldRegistry'
import { useBasisForm } from './useBasisForm'

const props = defineProps({
  hideSubmitBtn: {
    type: Boolean,
    default: false,
  },
})

const {
  formRef,
  formData,
  formRules,
  recordNumberRules,
  basePathRules,
  headerThemeAreas,
  loading,
  error,
  saving,
  showBtn,
  canEdit,
  sectionEditMode,
  editingSection,
  placeholder,
  displayTheme,
  displayLayout,
  maskedSecret,
  logoSrc,
  icoSrc,
  backgroundSrc,
  changeHeaderTheme,
  displayValue,
  isEditing,
  startEdit,
  cancelEdit,
  loadDetails,
  submit,
} = useBasisForm(props.hideSubmitBtn)

defineExpose({
  submit,
})
</script>

<style scoped lang="less" src="./Form.less"></style>