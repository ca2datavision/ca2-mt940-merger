export function escapeCSVField(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function rowToCSV(row: Record<string, unknown>): string {
  return Object.values(row).map(escapeCSVField).join(',');
}

export function toCSV(headers: string[], rows: Record<string, unknown>[]): string {
  return [
    headers.map(escapeCSVField).join(','),
    ...rows.map(rowToCSV)
  ].join('\n');
}
