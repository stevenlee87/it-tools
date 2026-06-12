export const defaultRecordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA'] as const;

export const allRecordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'SRV', 'CAA', 'PTR'] as const;

export type DnsRecordType = typeof allRecordTypes[number];

const dnsTypeNumberToName: Record<number, string> = {
  1: 'A',
  2: 'NS',
  5: 'CNAME',
  6: 'SOA',
  12: 'PTR',
  15: 'MX',
  16: 'TXT',
  28: 'AAAA',
  33: 'SRV',
  257: 'CAA',
};

export function getTypeName(typeNumber: number): string {
  return dnsTypeNumberToName[typeNumber] ?? `TYPE${typeNumber}`;
}

export interface DnsAnswer {
  name: string
  type: number
  TTL: number
  data: string
}

export interface DnsResponse {
  Status: number
  TC: boolean
  RD: boolean
  RA: boolean
  AD: boolean
  CD: boolean
  Question: { name: string; type: number }[]
  Answer?: DnsAnswer[]
  Authority?: DnsAnswer[]
}

export async function queryDns({ domain, type }: { domain: string; type: string }): Promise<DnsResponse> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}`;

  const response = await fetch(url, {
    headers: { Accept: 'application/dns-json' },
  });

  if (!response.ok) {
    throw new Error(`DNS query failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function queryAllDns(domain: string, types: readonly string[]): Promise<DnsAnswer[]> {
  const results = await Promise.allSettled(
    types.map(type => queryDns({ domain, type })),
  );

  const seen = new Set<string>();
  const answers: DnsAnswer[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.Answer) {
      for (const answer of result.value.Answer) {
        const key = `${answer.type}|${answer.name}|${answer.data}`;
        if (!seen.has(key)) {
          seen.add(key);
          answers.push(answer);
        }
      }
    }
  }

  return answers;
}

export function formatDnsRecords(answers: DnsAnswer[]): string {
  if (answers.length === 0) {
    return 'No records found';
  }

  const lines = answers.map((answer) => {
    const typeName = getTypeName(answer.type);
    return `${typeName}\t${answer.name}\t${answer.TTL}s\t${answer.data}`;
  });

  return lines.join('\n');
}
