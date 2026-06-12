export const dnsRecordTypes = [
  { label: 'A', value: 'A' },
  { label: 'AAAA', value: 'AAAA' },
  { label: 'CNAME', value: 'CNAME' },
  { label: 'MX', value: 'MX' },
  { label: 'TXT', value: 'TXT' },
  { label: 'NS', value: 'NS' },
  { label: 'SOA', value: 'SOA' },
  { label: 'SRV', value: 'SRV' },
  { label: 'CAA', value: 'CAA' },
  { label: 'PTR', value: 'PTR' },
] as const;

export type DnsRecordType = typeof dnsRecordTypes[number]['value'];

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

const dnsStatusCodes: Record<number, string> = {
  0: 'NOERROR',
  1: 'FORMERR',
  2: 'SERVFAIL',
  3: 'NXDOMAIN',
  4: 'NOTIMP',
  5: 'REFUSED',
};

export function getDnsStatusText(status: number): string {
  return dnsStatusCodes[status] ?? `UNKNOWN (${status})`;
}

export async function queryDns({ domain, type }: { domain: string; type: DnsRecordType }): Promise<DnsResponse> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}`;

  const response = await fetch(url, {
    headers: { Accept: 'application/dns-json' },
  });

  if (!response.ok) {
    throw new Error(`DNS query failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export function formatDnsRecords(answers: DnsAnswer[]): string {
  if (answers.length === 0) {
    return 'No records found';
  }

  const lines = answers.map((answer) => {
    const ttl = formatTTL(answer.TTL);
    return `${answer.name}  ${ttl}  ${answer.data}`;
  });

  return lines.join('\n');
}

function formatTTL(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m${seconds % 60 ? ` ${seconds % 60}s` : ''}`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h${m ? ` ${m}m` : ''}`;
}
