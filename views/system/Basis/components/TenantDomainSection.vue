<template>
  <section class="project-section project-domain-section">
    <header class="project-section__header">
      <div>
        <h2>{{ t('ProjectConfig.domain.title') }}</h2>
        <p class="project-domain-section__description">{{ t('ProjectConfig.domain.description') }}</p>
      </div>
    </header>

    <a-alert
      v-if="!loading && !capability?.enabled"
      type="warning"
      show-icon
      :message="t('ProjectConfig.domain.disabled')"
    />
    <a-spin v-else-if="loading" />
    <template v-else>
      <section class="project-domain-intro">
        <div>
          <h3>{{ t('ProjectConfig.domain.bindTitle') }}</h3>
          <p>{{ t('ProjectConfig.domain.bindDescription') }}</p>
        </div>
        <div class="project-domain-target">
          <span>{{ t('ProjectConfig.domain.cnameTarget') }}</span>
          <strong>{{ capability?.cnameTarget || '-' }}</strong>
        </div>
      </section>

      <div class="project-domain-flow">
        <section class="project-domain-step" :class="{ 'is-complete': cnameValidated }">
          <div class="project-domain-step__title">
            <span class="project-domain-step__index">1</span>
            <h3>{{ t('ProjectConfig.domain.step.cname') }}</h3>
          </div>
          <p>{{ t('ProjectConfig.domain.cnameDescription') }}</p>
          <a-form layout="vertical">
            <a-form-item :label="t('ProjectConfig.domain.domain')">
              <a-input
                v-model:value="form.domain"
                :placeholder="t('ProjectConfig.domain.domainPlaceholder')"
                @change="resetWorkflow"
              />
            </a-form-item>
            <a-button
              type="primary"
              html-type="button"
              :loading="cnameLoading"
              @click="validateCname"
            >
              {{ t('ProjectConfig.domain.validateCname') }}
            </a-button>
            <a-tag v-if="cnameValidated" color="success">
              {{ t('ProjectConfig.domain.cnamePassed') }}
            </a-tag>
          </a-form>
        </section>

        <section
          class="project-domain-step"
          :class="{ 'is-disabled': !cnameValidated, 'is-complete': certificateUploaded }"
        >
          <div class="project-domain-step__title">
            <span class="project-domain-step__index">2</span>
            <h3>{{ t('ProjectConfig.domain.step.certificate') }}</h3>
          </div>
          <p>{{ t('ProjectConfig.domain.certificateDescription') }}</p>
          <div class="project-domain-files">
            <a-upload
              :before-upload="selectPrivateKey"
              :show-upload-list="false"
              :disabled="!cnameValidated || uploadLoading"
              accept=".key,.pem"
            >
              <div class="project-domain-file-picker">
                <UploadOutlined />
                <span>{{ privateKeyFile?.name || t('ProjectConfig.domain.privateKey') }}</span>
              </div>
            </a-upload>
            <a-upload
              :before-upload="selectCertificate"
              :show-upload-list="false"
              :disabled="!cnameValidated || uploadLoading"
              accept=".pem,.crt,.cer"
            >
              <div class="project-domain-file-picker">
                <UploadOutlined />
                <span>{{ certificateFile?.name || t('ProjectConfig.domain.certificateChain') }}</span>
              </div>
            </a-upload>
          </div>
          <a-button
            type="primary"
            html-type="button"
            :loading="uploadLoading"
            :disabled="!privateKeyFile || !certificateFile"
            @click="uploadCertificate"
          >
            {{ t('ProjectConfig.domain.uploadContinue') }}
          </a-button>
          <a-tag v-if="certificateUploaded" color="success">
            {{ t('ProjectConfig.domain.uploaded') }}
          </a-tag>
        </section>

        <section
          class="project-domain-step"
          :class="{ 'is-disabled': !certificateUploaded, 'is-complete': effectivenessTested }"
        >
          <div class="project-domain-step__title">
            <span class="project-domain-step__index">3</span>
            <h3>{{ t('ProjectConfig.domain.step.effectiveness') }}</h3>
          </div>
          <p>{{ t('ProjectConfig.domain.effectivenessDescription') }}</p>
          <div class="project-domain-actions">
            <a-button
              html-type="button"
              :loading="testLoading"
              :disabled="!certificateUploaded"
              @click="testEffectiveness"
            >
              {{ t('ProjectConfig.domain.testEffectiveness') }}
            </a-button>
            <a-button
              type="primary"
              html-type="button"
              :loading="saveLoading"
              :disabled="!effectivenessTested"
              @click="saveConfiguration"
            >
              {{ t('ProjectConfig.domain.save') }}
            </a-button>
          </div>
          <a-tag v-if="effectivenessTested" color="success">
            {{ t('ProjectConfig.domain.effectivenessPassed') }}
          </a-tag>
        </section>
      </div>

      <div v-if="domain" class="project-domain-status">
        <span>{{ t('ProjectConfig.domain.currentState') }}</span>
        <a-tag :color="stateColor">{{ stateText }}</a-tag>
        <span>{{ domain.domain }}</span>
        <a-popconfirm
          :title="t('ProjectConfig.domain.deleteConfirm')"
          @confirm="deleteDomain"
        >
          <a-button danger type="link" :loading="deleteLoading">
            {{ t('ProjectConfig.domain.delete') }}
          </a-button>
        </a-popconfirm>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { UploadOutlined } from '@ant-design/icons-vue'
import { useI18n } from 'vue-i18n'
import {
  deleteProjectTenantDomain,
  getProjectTenantDomain,
  getProjectTenantDomainCapability,
  getProjectTenantDomainWorkflow,
  saveProjectTenantDomain,
  testProjectTenantDomain,
  uploadProjectTenantDomainCertificate,
  unwrapProjectTenantDomainResult,
  validateProjectTenantDomainCname,
  type ProjectTenantDomain,
  type ProjectTenantDomainCapability,
  type ProjectTenantDomainCertificateMode,
  type ProjectTenantDomainWorkflow,
} from '../../../../api/tenantDomain'

const { t } = useI18n()
const loading = ref(true)
const cnameLoading = ref(false)
const uploadLoading = ref(false)
const testLoading = ref(false)
const saveLoading = ref(false)
const deleteLoading = ref(false)
const capability = ref<ProjectTenantDomainCapability>()
const domain = ref<ProjectTenantDomain>()
const cnameValidated = ref(false)
const certificateUploaded = ref(false)
const effectivenessTested = ref(false)
const validatedDomain = ref('')
const privateKeyFile = ref<File>()
const certificateFile = ref<File>()
const form = reactive({ domain: '', certificateMode: 'uploaded' as ProjectTenantDomainCertificateMode })

const stateText = computed(() => t(`ProjectConfig.domain.state.${domain.value?.state || 'pending_dns'}`))
const stateColor = computed(() => (
  domain.value?.state === 'ready' ? 'success' : domain.value?.state === 'failed' ? 'error' : 'processing'
))

const resetWorkflow = () => {
  cnameValidated.value = false
  certificateUploaded.value = false
  effectivenessTested.value = false
  validatedDomain.value = ''
  privateKeyFile.value = undefined
  certificateFile.value = undefined
}

const refresh = async () => {
  const [domainResponse, workflowResponse] = await Promise.all([
    getProjectTenantDomain(),
    getProjectTenantDomainWorkflow(),
  ])
  domain.value = unwrapProjectTenantDomainResult<ProjectTenantDomain>(domainResponse)
  const workflow = unwrapProjectTenantDomainResult<ProjectTenantDomainWorkflow>(workflowResponse)
  if (domain.value) form.domain = domain.value.domain
  if (workflow) {
    cnameValidated.value = workflow.cnameValidated
    certificateUploaded.value = workflow.certificateUploaded
    effectivenessTested.value = workflow.effectivenessTested
    validatedDomain.value = workflow.cnameValidated ? workflow.domain : ''
  }
}

const validateCname = async () => {
  const domainName = form.domain.trim()
  if (!domainName) return
  cnameLoading.value = true
  try {
    const valid = Boolean(unwrapProjectTenantDomainResult<boolean>(await validateProjectTenantDomainCname(domainName)))
    cnameValidated.value = valid
    validatedDomain.value = valid ? domainName : ''
    if (!valid) {
      message.warning(t('ProjectConfig.domain.cnameFailed'))
      return
    }
    await saveProjectTenantDomain({ domain: domainName, certificateMode: form.certificateMode })
    await refresh()
    message.success(t('ProjectConfig.domain.cnamePassed'))
  } finally {
    cnameLoading.value = false
  }
}

const selectPrivateKey = (file: File) => {
  privateKeyFile.value = file
  return false
}

const selectCertificate = (file: File) => {
  certificateFile.value = file
  return false
}

const uploadCertificate = async () => {
  if (validatedDomain.value !== form.domain || !privateKeyFile.value || !certificateFile.value) return
  uploadLoading.value = true
  try {
    await uploadProjectTenantDomainCertificate(certificateFile.value, privateKeyFile.value)
    await refresh()
    certificateUploaded.value = true
    message.success(t('ProjectConfig.domain.uploaded'))
  } finally {
    uploadLoading.value = false
  }
}

const testEffectiveness = async () => {
  testLoading.value = true
  try {
    effectivenessTested.value = Boolean(unwrapProjectTenantDomainResult<boolean>(await testProjectTenantDomain()))
    await refresh()
    effectivenessTested.value
      ? message.success(t('ProjectConfig.domain.effectivenessPassed'))
      : message.warning(t('ProjectConfig.domain.effectivenessFailed'))
  } finally {
    testLoading.value = false
  }
}

const saveConfiguration = async () => {
  if (!effectivenessTested.value) return
  saveLoading.value = true
  try {
    await saveProjectTenantDomain({ domain: form.domain, certificateMode: 'uploaded' })
    await refresh()
    message.success(t('ProjectConfig.domain.saved'))
  } finally {
    saveLoading.value = false
  }
}

// 删除接口会清理租户域名和运行时绑定；成功后同步清空向导草稿。
const deleteDomain = async () => {
  deleteLoading.value = true
  try {
    await deleteProjectTenantDomain()
    domain.value = undefined
    form.domain = ''
    resetWorkflow()
    message.success(t('ProjectConfig.domain.deleted'))
  } finally {
    deleteLoading.value = false
  }
}

onMounted(async () => {
  try {
    capability.value = unwrapProjectTenantDomainResult<ProjectTenantDomainCapability>(
      await getProjectTenantDomainCapability(),
    )
    if (capability.value?.enabled) await refresh()
  } finally {
    loading.value = false
  }
})
</script>

<style scoped lang="less" src="./TenantDomainSection.less"></style>
