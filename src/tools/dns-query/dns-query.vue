<script setup lang="ts">
import { useCopy } from '@/composable/copy';
import { queryAllDns, formatDnsRecords, getTypeName, defaultRecordTypes } from './dns-query.service';
import type { DnsAnswer } from './dns-query.service';

const domain = ref('example.com');
const isLoading = ref(false);
const errorMessage = ref('');
const answers = ref<DnsAnswer[]>([]);
const hasQueried = ref(false);

const domainValidationRules = [
  {
    message: 'Please enter a valid domain name',
    validator: (value: string) => /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(value.trim()),
  },
];

const groupedAnswers = computed(() => {
  const groups: { type: string; records: DnsAnswer[] }[] = [];
  const seen = new Map<string, DnsAnswer[]>();

  for (const answer of answers.value) {
    const typeName = getTypeName(answer.type);
    if (!seen.has(typeName)) {
      const records: DnsAnswer[] = [];
      seen.set(typeName, records);
      groups.push({ type: typeName, records });
    }
    seen.get(typeName)!.push(answer);
  }

  return groups;
});

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
  hasQueried.value = true;

  try {
    answers.value = await queryAllDns(trimmed, defaultRecordTypes);
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

    <div flex justify-center mb-4>
      <c-button :disabled="!domain.trim() || isLoading" @click="doQuery()">
        {{ isLoading ? 'Querying...' : 'Query DNS' }}
      </c-button>
    </div>

    <n-alert v-if="errorMessage" type="error" mb-4>
      {{ errorMessage }}
    </n-alert>

    <div v-if="hasQueried && !isLoading && !errorMessage">
      <div v-if="groupedAnswers.length > 0">
        <div v-for="group in groupedAnswers" :key="group.type" mb-4>
          <div mb-2 font-bold text-15px>
            {{ group.type }}
          </div>
          <n-table :bordered="true" :single-line="false" size="small">
            <thead>
              <tr>
                <th>Name</th>
                <th>TTL</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(answer, index) in group.records" :key="index">
                <td>{{ answer.name }}</td>
                <td>{{ answer.TTL }}s</td>
                <td style="word-break: break-all;">
                  {{ answer.data }}
                </td>
              </tr>
            </tbody>
          </n-table>
        </div>

        <div flex justify-center>
          <c-button @click="copy()">
            Copy results
          </c-button>
        </div>
      </div>

      <c-card v-else mb-4>
        <div italic op-60>
          No records found for this domain.
        </div>
      </c-card>
    </div>
  </div>
</template>
