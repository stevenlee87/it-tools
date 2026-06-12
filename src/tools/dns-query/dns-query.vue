<script setup lang="ts">
import { useCopy } from '@/composable/copy';
import { queryDns, formatDnsRecords, getDnsStatusText, dnsRecordTypes } from './dns-query.service';
import type { DnsAnswer, DnsRecordType } from './dns-query.service';

const domain = ref('example.com');
const recordType = ref<DnsRecordType>('A');
const isLoading = ref(false);
const errorMessage = ref('');
const answers = ref<DnsAnswer[]>([]);
const statusText = ref('');
const hasQueried = ref(false);

const domainValidationRules = [
  {
    message: 'Please enter a valid domain name',
    validator: (value: string) => /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(value.trim()),
  },
];

const formattedResult = computed(() => formatDnsRecords(answers.value));

const { copy } = useCopy({ source: formattedResult, text: 'DNS records copied to the clipboard' });

async function doQuery() {
  const trimmed = domain.value.trim();
  if (!trimmed) {
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';
  answers.value = [];
  statusText.value = '';
  hasQueried.value = true;

  try {
    const result = await queryDns({ domain: trimmed, type: recordType.value });
    statusText.value = getDnsStatusText(result.Status);
    answers.value = result.Answer ?? [];
  }
  catch (err: unknown) {
    errorMessage.value = err instanceof Error ? err.message : 'DNS query failed';
  }
  finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div>
    <c-input-text
      v-model:value="domain"
      label="Domain name"
      placeholder="e.g. example.com"
      clearable
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
      :validation-rules="domainValidationRules"
      mb-4
    />

    <c-select
      v-model:value="recordType"
      label="Record type"
      :options="dnsRecordTypes"
      mb-4
    />

    <div flex justify-center mb-4>
      <c-button :disabled="!domain.trim()" @click="doQuery()">
        {{ isLoading ? 'Querying...' : 'Query DNS' }}
      </c-button>
    </div>

    <n-alert v-if="errorMessage" type="error" mb-4>
      {{ errorMessage }}
    </n-alert>

    <div v-if="hasQueried && !isLoading && !errorMessage">
      <div mb-2 flex items-center gap-2>
        <span font-bold>Status:</span>
        <span>{{ statusText }}</span>
      </div>

      <n-table v-if="answers.length > 0" :bordered="true" :single-line="false" size="small" mb-4>
        <thead>
          <tr>
            <th>Name</th>
            <th>TTL</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(answer, index) in answers" :key="index">
            <td>{{ answer.name }}</td>
            <td>{{ answer.TTL }}s</td>
            <td style="word-break: break-all;">
              {{ answer.data }}
            </td>
          </tr>
        </tbody>
      </n-table>

      <c-card v-else mb-4>
        <div italic op-60>
          No records found for this domain and record type.
        </div>
      </c-card>

      <div v-if="answers.length > 0" flex justify-center>
        <c-button @click="copy()">
          Copy results
        </c-button>
      </div>
    </div>
  </div>
</template>
