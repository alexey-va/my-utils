/** Ant Design InputNumber formatter — strips leading zeros. */
export function formatNumberInput(v?: string | number): string {
  if (v === undefined || v === null) return "";
  return String(v).replace(/^(-?)0+(?=\d)/, "$1");
}

/** Ant Design InputNumber parser — digits only, leading zeros stripped. */
export function parseNumberInput(v?: string): number {
  if (!v) return 0;
  const s = v.replace(/[^\d-]/g, "").replace(/^(-?)0+(?=\d)/, "$1");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
