/** RFC 4180 CSV: quoted when needed, embedded quotes doubled, CRLF line ends. */
export interface CsvColumn {
  key: string;
  label: string;
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "string" ? value : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: Record<string, unknown>[], columns: CsvColumn[]): string {
  const lines = [columns.map((c) => cell(c.label)).join(",")];
  for (const row of rows) lines.push(columns.map((c) => cell(row[c.key])).join(","));
  return lines.join("\r\n") + "\r\n";
}
